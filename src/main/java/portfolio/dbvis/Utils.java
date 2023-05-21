package portfolio.dbvis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.servlet.http.HttpServletRequest;
import javax.swing.filechooser.FileSystemView;
import org.apache.commons.io.FileUtils;
import org.apache.maven.surefire.shade.booter.org.apache.commons.lang3.SystemUtils;

/**
 *
 * @author RLvan
 */
public class Utils {
    
    public final static String[] extensions = new String[]{"json","sql"};
    public static Path workingDir = null;
    public static String programFilesPath = "";
    public static String rootPath = "";
    public static String defaultWorkingDirectory = null;
    private static String settings = null;
    public final static String settingsFileName = "dbvis_settings.json";
    public static String currentPath = "";
    public static ArrayNode prevOpened = new ObjectMapper().createArrayNode();

    public static String getBody(HttpServletRequest request) throws IOException {
        String body = null;
        StringBuilder stringBuilder = new StringBuilder();
        BufferedReader bufferedReader = null;
        try {
            InputStream inputStream = request.getInputStream();
            if (inputStream != null) {
                bufferedReader = new BufferedReader(new InputStreamReader(inputStream));
                char[] charBuffer = new char[128];
                int bytesRead = -1;
                while ((bytesRead = bufferedReader.read(charBuffer)) > 0) {
                    stringBuilder.append(charBuffer, 0, bytesRead);
                }
            } else {
                stringBuilder.append("");
            }
        } catch (IOException ex) {
            throw ex;
        } finally {
            if (bufferedReader != null) {
                try {
                    bufferedReader.close();
                } catch (IOException ex) {
                    throw ex;
                }
            }
        }

        body = stringBuilder.toString();
        return body;
    }
    
    public static Boolean determineOS(){
        Boolean OSDetermined = true;
        if (programFilesPath.equals("") || rootPath.equals("")){
            if (SystemUtils.IS_OS_WINDOWS){
                rootPath = "C:\\";
                programFilesPath = "C:\\Program Files";
            } else if (SystemUtils.IS_OS_MAC){
                rootPath = "/";
                programFilesPath = "/Applications";
            } else if (SystemUtils.IS_OS_LINUX){
                rootPath = "/";
                programFilesPath = "/opt";
            } else {
                OSDetermined = false;
            }
        }
        if (workingDir == null) { workingDir = Paths.get(FileSystemView.getFileSystemView().getDefaultDirectory().getPath()); }
        return OSDetermined;
    }
    
    public static String findAndReadFile(String fileName, String workingDir) throws IOException {
        String pathToFile = null;
        if (workingDir != null) {
            Iterator<File> fileIterator = FileUtils.iterateFiles(new File(workingDir), extensions, true);
            while (fileIterator.hasNext() && pathToFile == null) {
                File file = fileIterator.next();
                if (file.getName().equals(fileName)) { pathToFile = file.getPath(); }
            }
        }
        if (pathToFile == null) {
            if (defaultWorkingDirectory == null) { loadSettings(); }
            if (defaultWorkingDirectory != null) {
                Iterator<File> fileIterator = FileUtils.iterateFiles(new File(defaultWorkingDirectory), extensions, true);
                while (fileIterator.hasNext() && pathToFile == null) {
                    File file = fileIterator.next();
                    if (file.getName().equals(fileName)) { pathToFile = file.getPath(); }
                }
            }
            if (pathToFile == null) {
                Iterator<File> fileIterator = FileUtils.iterateFiles(new File(Utils.rootPath), Utils.extensions, true);
                while (fileIterator.hasNext() && pathToFile == null) {
                    File file = fileIterator.next();
                    if (file.getName().equals(fileName)) { pathToFile = file.getPath(); }
                }
            }
        }
        if (pathToFile == null) { return "Invalid file, no path"; }
        String project = new String(Files.readAllBytes(Paths.get(pathToFile)));
//        if (!checkFileValidity(project)) { return "Invalid file, not MIKAT"; }
        currentPath = pathToFile;
        return project;
    }
    
    public static void writeSettings() throws IOException {
        String settingsString = "{";
        settingsString += "\"prevOpened\":" + prevOpened.toPrettyString() + ",\"defaultWorkingDirectory\":\"" + defaultWorkingDirectory.replace("\\", "\\\\") + "\"}";
        FileWriter settingsFile = new FileWriter(programFilesPath + "//" + settingsFileName);
        settingsFile.write(settingsString);
        settingsFile.close();
    }
    
    public static void loadSettings() throws IOException{
        if (settings == null || defaultWorkingDirectory == null){
            if (rootPath == "") {
                determineOS();
            }
            String fileLocation = programFilesPath + "\\" + settingsFileName;
            Path path = Paths.get(fileLocation);
            if (Files.exists(path)) {
                settings = new String(Files.readAllBytes(path));
            } else {
                Iterator<File> localFileIteratorC = FileUtils.iterateFiles(new File(rootPath), extensions, true);
                while(localFileIteratorC.hasNext() && fileLocation == null) {
                    File file = localFileIteratorC.next();
                    if (file.getName().equals(settingsFileName)) { fileLocation = file.getPath(); }
                }
                settings = new String(Files.readAllBytes(Paths.get(fileLocation)));
            }
            if (fileLocation == null) { writeSettings(); }
            ObjectMapper mapper = new ObjectMapper();
            JsonNode settingsNode = mapper.readTree(settings);
            prevOpened = (ArrayNode) settingsNode.get("prevOpened");
            defaultWorkingDirectory = settingsNode.get("defaultWorkingDirectory").asText();
        }
    }
    
    public static void updatePrevOpened(String fileName) throws IOException{
        ObjectMapper mapper = new ObjectMapper();
        ArrayNode newPrevOpened = new ObjectMapper().createArrayNode();
        for (int i = 0; i < prevOpened.size(); i++){
            String prevOpenedFileName = prevOpened.get(i).get("fileName").toString().replaceAll("\"", "");
            if (!prevOpenedFileName.equals(fileName)) {
                newPrevOpened.insert(i, prevOpened.get(i));
            }
        }
        
        ObjectNode projectFile = mapper.createObjectNode();
        projectFile.put("fileName", fileName);
        projectFile.put("path", currentPath);
        projectFile.put("date", new Date().toString());
        newPrevOpened.insert(0, projectFile);
        if (newPrevOpened.size() > 5) { newPrevOpened.remove(5); }
        prevOpened = newPrevOpened;
        writeSettings();
    }
    
     public static Boolean checkFileValidity(String projectString) throws JsonProcessingException{
        if (projectString.startsWith("\"")) { projectString = projectString.substring(1, projectString.length()); }
        ObjectMapper mapper = new ObjectMapper();
        JsonNode project = mapper.readTree(projectString);
        // check whether file was created by this program and contains the correct 'keys'
        JsonNode projectName = project.get("title");
        JsonNode workingDir = project.get("workingDir");
        JsonNode database = project.get("databaseFileName");
        JsonNode groups = project.get("groups");
        
        if (projectName == null || workingDir == null || database == null || groups == null) { return false; }
        return true;
     }
    
     public static String readProjectFromFile() throws IOException{
        if (!currentPath.equals("")) {
            String file =  new String(Files.readAllBytes(Paths.get(currentPath)));
            String fileContent = file.substring(1, file.length());
            if (checkFileValidity(file)){
                return fileContent;
            } else {
                return "file invalid";
            }
        } else {
            return "null";
        }
    }
     
    public static Table statementToTable(String creationStatement) throws Exception{
        Pattern tablePattern = Pattern.compile("(CREATE|create)[ ]?(TEMPORARY|temporary)?[ ]?(TABLE|table)[ ]?(if not exists|IF NOT EXISTS)?[ ]?(.*)");
        Matcher tableMatcher = tablePattern.matcher(creationStatement.strip());
        Boolean tableMatchFound = tableMatcher.find();
        if (tableMatchFound){
            String match = tableMatcher.group(tableMatcher.groupCount());
            String[] matchSplit = match.split("\\(");
            String tableName = matchSplit[0].strip();
            String fieldsString = matchSplit[1];
            fieldsString = fieldsString.substring(0, fieldsString.length() - 1);
            String[] fields = fieldsString.split(",");
            ArrayList<String> tableFields = new ArrayList<>();
            
            for (String item : fields){
                tableFields.add(item.strip());
            }            
            return new Table(tableName, tableFields);
        }
        else {
            throw new Exception("invalid statement");
        }
    }
}


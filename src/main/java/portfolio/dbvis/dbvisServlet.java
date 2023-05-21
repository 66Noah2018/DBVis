package portfolio.dbvis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.FileUtils;
import org.javatuples.Pair;
import org.javatuples.Triplet;
import static portfolio.dbvis.Utils.defaultWorkingDirectory;
import static portfolio.dbvis.Utils.extensions;
import static portfolio.dbvis.Utils.loadSettings;

/**
 *
 * @author RLvan
 */
@WebServlet(name = "dbvisServlet", urlPatterns = {"/dbvisservlet"})
public class dbvisServlet extends HttpServlet {
    // currentstate: linkedlist<Table> state, ArrayList<Triplet<groupId, groupName, groupColor(hex)>>
    private Pair<LinkedList<Table>, ArrayList<Triplet<String, String, String>>> currentState = new Pair(new LinkedList<>(), new ArrayList<>());
    private String projectName = null;
    private String databaseFileName = null;


    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        switch(request.getParameter("function")){
            case "getGroups": // get all groups
                response.getWriter().write("{\"groups\":" + JSONEncoder.encodeGroups(currentState.getValue1()) + "}");
                break;
            case "setGroups":
                setGroups(request);
                break;
            case "getWorkingDir": // get working directory
                break;
            case "setWorkingDirectory":
                setWorkingDirectory(request);
                break;
            case "editProject": // save project as DBVis file
                editProject(request);
                break;
            case "saveProject":
                saveProject();
                break;
            case "getState": // get current state as JSON
                response.getWriter().write("{\"state\":" + JSONEncoder.encodeDatabase(currentState.getValue0()) + "}");
                break;
            case "open":
                String returnValue = openProject(request);
                response.getWriter().write("{\"response\":\"" + returnValue + "\"}");
                break;
            case "getDefaultWorkingDirectory":
                if (Utils.defaultWorkingDirectory == null) { Utils.loadSettings(); }
                response.getWriter().write("{\"defaultWorkingDirectory\":\"" + Utils.defaultWorkingDirectory.replace("\\", "\\\\") + "\"}");
                break;
            case "getProjectProperties":
                String properties = Utils.readProjectFromFile();
                response.getWriter().write(properties);
                break;
            case "directoryExists":
                Boolean exists = directoryExists(request);
                response.getWriter().write("{\"directoryExists\":" + exists + "}");
                break;
            case "getPrevOpened":
                Utils.loadSettings();
                String prevOpenedString = Utils.prevOpened.toString();
                response.getWriter().write(prevOpenedString);
                break;
            case "setCoordinates":
                setTableCoordinates(request);
            case "addToGroup":
                addTableToGroup(request);
                response.getWriter().write("{\"state\":" + JSONEncoder.encodeDatabase(currentState.getValue0()) + "}");
            default:
                break;
        }
    }
    
    private void addTableToGroup(HttpServletRequest request) {
        String tableId = request.getParameter("tableId");
        String groupId = request.getParameter("groupId");
        System.out.println(tableId);
        System.out.println(groupId);
        for (int i = 0; i < currentState.getValue0().size(); i++){
            if (currentState.getValue0().get(i).getTableId().equals(tableId)){
                LinkedList<Table> state = currentState.getValue0();
                Table newTable = currentState.getValue0().get(i);
                newTable.setGroupId(groupId);
                state.set(i, newTable);
                currentState = new Pair<>(state, currentState.getValue1());
                return;
            }
        }
    }
    
    private void setGroups(HttpServletRequest request) throws IOException {
        String requestBody = Utils.getBody(request);
        Pattern groupPattern = Pattern.compile("\"groups\":\\[(.*)\\]");
        Matcher groupMatcher = groupPattern.matcher(requestBody);
        groupMatcher.find();
        ArrayList<Triplet<String, String, String>> groups = JSONDecoder.decodeGroups(groupMatcher.group(1));
        currentState = new Pair<>(currentState.getValue0(), groups);        
    }
    
    private void setTableCoordinates(HttpServletRequest request) throws IOException {
        String requestBody = Utils.getBody(request);
        
        Pattern coordinatePattern = Pattern.compile("\\{\"panelId\":\"panel-(.*)\",\"x\":(.*),\"y\":(.*)\\}");
        Matcher coordinateMatcher = coordinatePattern.matcher(requestBody);
        Boolean matchFound = coordinateMatcher.find();
        
        if (matchFound) {
            String tableId = coordinateMatcher.group(1);
            Float xCoordinate = Float.parseFloat(coordinateMatcher.group(2));
            Float yCoordinate = Float.parseFloat(coordinateMatcher.group(3));
            for (int i = 0; i < currentState.getValue0().size(); i++) {
                if (currentState.getValue0().get(i).getTableId().equals(tableId)) {
                    LinkedList<Table> state = currentState.getValue0();
                    Table newTable = currentState.getValue0().get(i);
                    newTable.setXCoordinate(xCoordinate);
                    newTable.setYCoordinate(yCoordinate);
                    state.set(i, newTable);
                    currentState = new Pair<>(state, currentState.getValue1());
                    return;
                }
            }
        }
    }
    
    private void setWorkingDirectory(HttpServletRequest request) throws IOException {
        String folder = Utils.getBody(request).replace("\"", "");
        Utils.workingDir = Paths.get(folder);
        if (Utils.defaultWorkingDirectory == null) { 
            Utils.defaultWorkingDirectory = folder;
            Utils.writeSettings();
        }
    }
    
    private Boolean directoryExists(HttpServletRequest request) throws IOException {
        String folder = Utils.getBody(request).replace("\\\\", "\\").replace("\"", "");
        Path path = Paths.get(folder);
        return Files.exists(path);
    }
    
    private void saveProject() throws JsonProcessingException, IOException{
        String stateString = JSONEncoder.encodeDatabase(currentState.getValue0());
        String groupsString = JSONEncoder.encodeGroups(currentState.getValue1());
        String workingDir = Utils.workingDir.toString();
        String body = "{\"title\":\"" + projectName + "\",\"databaseFileName\":\"" + databaseFileName + "\",\"workingDir\":\"" + workingDir.replace("\\", "\\\\") + "\",\"state\":" + stateString + ",\"groups\":" + groupsString + "}";
        
        String fileLocation = Utils.workingDir + "\\" + projectName + ".json";
        
        FileWriter file = new FileWriter(fileLocation);
        file.write(body);
        file.close();
    }
    
    private void editProject(HttpServletRequest request) throws IOException{
        String isNew = request.getParameter("isNew");
//        if (isNew.equals("true")) { clearAllStacks(); }
        Utils.determineOS();
        
        String body = Utils.getBody(request).replace("\\\"", "\"");
        body = body.replace("\\\\", "\\");
        
        if (isNew.equals("true")) {
            currentState = new Pair(new LinkedList<>(), new ArrayList<>());
            Pattern databasePattern = Pattern.compile("\"databaseFileName\":\"(.*)\",\"w");
            Matcher databaseMatcher = databasePattern.matcher(body);
            databaseMatcher.find();
            readDatabaseIntoState(databaseMatcher.group(1));
        }
        
        String stateString = JSONEncoder.encodeDatabase(currentState.getValue0());
        String groupsString = JSONEncoder.encodeGroups(currentState.getValue1());
        
        body = body.substring(1, (body.length()-2));
        body += ",\"state\":" + stateString + ",\"groups\":" + groupsString + "}";
        
        Pattern projectNamePattern = Pattern.compile("\"title\":\"(.*)\",\"databaseFileName\":\"(.*)\",\"w");
        Matcher projectNameMatcher = projectNamePattern.matcher(body);
        projectNameMatcher.find();
       
        projectName = projectNameMatcher.group(1);
        databaseFileName = projectNameMatcher.group(2);
        
        Pattern workingDirPattern = Pattern.compile("\"workingDir\":\"(.*)\",\"state");
        Matcher workingDirMatcher = workingDirPattern.matcher(body);
        workingDirMatcher.find();
        Utils.workingDir = Paths.get(workingDirMatcher.group(1));
        
        String fileLocation = Utils.workingDir + "\\" + projectName + ".json";
        Utils.currentPath = fileLocation;
        
        if (isNew.equals("true")) { Utils.updatePrevOpened(projectName); }
        
        FileWriter file = new FileWriter(fileLocation);
        file.write(body);
        file.close();
    }
    
    private void readDatabaseIntoState (String fileName) throws IOException{
        String fileContents = Utils.findAndReadFile(fileName, Utils.workingDir.toString());
        if (!fileContents.equals("Invalid file, no path")){
            String[] databaseLines = fileContents.split(";");
            for (int i = 0; i < databaseLines.length; i++){
                try {
                    Table newTable = Utils.statementToTable(databaseLines[i]);
                    LinkedList<Table> newState = currentState.getValue0();
                    newState.add(newTable);
                    currentState = new Pair<>(newState, currentState.getValue1());
                } catch (Exception e) {} // do nothing cause these statements don't matter
            } 
        }
        return;
    }
    
    private String openProject(HttpServletRequest request) throws IOException{
        Boolean determinationSuccess = Utils.determineOS();
        if (!determinationSuccess) { return "Unsupported OS"; }
        Utils.loadSettings();
        String fileName = Utils.getBody(request);
        String project = null;
        if (fileName.contains("\\")) { 
            fileName = fileName.replace("\\\\", "\\");
            fileName = fileName.substring(1, fileName.length()-1); }
        if (fileName.startsWith(Utils.rootPath)) { // fully specified path
            project = new String(Files.readAllBytes(Paths.get(fileName)));
            if (!Utils.checkFileValidity(project)) { return "Invalid file, not DBVis"; }
            Utils.currentPath = fileName;
            fileName = Paths.get(fileName).getFileName().toString();
            
        } else { //find file and read
            String pathToFile = null;
            fileName = fileName.substring(1, fileName.length()-1);
            if (Utils.workingDir != null) {
                Iterator<File> fileIterator = FileUtils.iterateFiles(new File(Utils.workingDir.toString()), Utils.extensions, true);
                while (fileIterator.hasNext() && pathToFile == null) {
                    File file = fileIterator.next();
                    if (file.getName().equals(fileName)) { pathToFile = file.getPath(); }
                }
            }
            if (pathToFile == null) {
                if (defaultWorkingDirectory == null) { Utils.loadSettings(); }
                if (defaultWorkingDirectory != null) {
                    Iterator<File> fileIterator = FileUtils.iterateFiles(new File(Utils.defaultWorkingDirectory), Utils.extensions, true);
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
            project = new String(Files.readAllBytes(Paths.get(pathToFile)));
            if (!Utils.checkFileValidity(project)) { return "Invalid file, not DBVis"; }
            Utils.currentPath = pathToFile;
        }
        
        Pattern projectNamePattern = Pattern.compile("\"title\":\"(.*)\",\"databaseFileName");
        Pattern workingDirPattern = Pattern.compile("\"workingDir\":\"(.*)\",\"state");
        Pattern databasePattern = Pattern.compile("\"state\":(.*),\"gr");
        Pattern groupsPattern = Pattern.compile("\"groups\":(.*)}");
        Matcher projectNameMatcher = projectNamePattern.matcher(project);
        Matcher workingDirMatcher = workingDirPattern.matcher(project);
        Matcher databaseMatcher = databasePattern.matcher(project);
        Matcher groupsMatcher = groupsPattern.matcher(project);
        
        Boolean projectNameMatch = projectNameMatcher.find();
        Boolean workingDirMatch = workingDirMatcher.find();
        Boolean databaseMatch = databaseMatcher.find();
        Boolean groupsMatch = groupsMatcher.find();
        
        if(!projectNameMatch || !workingDirMatch || !databaseMatch || !groupsMatch) { return "File is not DBVis file"; }
        Utils.workingDir = Paths.get(workingDirMatcher.group(1));
        projectName = projectNameMatcher.group(1);
        
        LinkedList<Table> database = JSONDecoder.decodeDatabase(databaseMatcher.group(1));
        ArrayList<Triplet<String, String, String>> groups = JSONDecoder.decodeGroups(groupsMatcher.group(1));      
        
        currentState = new Pair(database, groups);
        Utils.updatePrevOpened(projectNameMatcher.group(1));
        
        return "File opened successfully";
    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}

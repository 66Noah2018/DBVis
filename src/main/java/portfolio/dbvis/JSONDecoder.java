package portfolio.dbvis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedList;
import static java.util.UUID.randomUUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.javatuples.Triplet;

/**
 *
 * @author RLvan
 */
public class JSONDecoder {
    public static Table decodeItem(String item){
        Pattern itemPattern = Pattern.compile("\"tableId\":\"(.*)\",\"tableName\":\"(.*)\",\"tableFields\":(.*),\"xCoordinate\":(.*),\"yCoordinate\":(.*),\"groupId\":\"(.*)\"}");
        Matcher itemMatcher = itemPattern.matcher(item);
        itemMatcher.find();
        
        String fieldsLong = itemMatcher.group(3).replaceAll("\"", "");
        if (fieldsLong.startsWith("[")) {
            fieldsLong = fieldsLong.substring(1, fieldsLong.length() - 1);
        }
        
        ArrayList<String> fields = new ArrayList<String>(Arrays.asList(fieldsLong.split(",")));
        Float xCoordinate = (itemMatcher.group(4).equals("null")) ? null : Float.parseFloat(itemMatcher.group(4));
        Float yCoordinate = (itemMatcher.group(5).equals("null")) ? null : Float.parseFloat(itemMatcher.group(5));
        String groupId = (itemMatcher.group(6).equals("null")) ? null : itemMatcher.group(6);

        return new Table(itemMatcher.group(1), itemMatcher.group(2), fields, xCoordinate, yCoordinate, groupId);
    }
    
    public static LinkedList<Table> decodeDatabase(String encodedChart) throws JsonProcessingException{
        ObjectMapper objectMapper = new ObjectMapper();
        ArrayNode tableList = (ArrayNode) objectMapper.readTree(encodedChart);
        LinkedList<Table> database = new LinkedList<>();
        for (int i = 0; i <tableList.size(); i++){
            database.add(decodeItem(tableList.get(i).toString()));
        }
        return database;
    }
    
    public static Triplet<String, String, String> decodeGroup(String item){
        System.out.println(item);
        Pattern itemPattern = Pattern.compile("\"groupId\": \"(.*)\", \"groupName\": \"(.*)\", \"groupColor\": \"(.*)\"");
        Matcher itemMatcher = itemPattern.matcher(item);
        itemMatcher.find();
        String id = (itemMatcher.group(1).equals("null")) ? randomUUID().toString() : itemMatcher.group(1);
        
        return new Triplet(id, itemMatcher.group(2), itemMatcher.group(3));
    }
    
    public static ArrayList<Triplet<String, String, String>> decodeGroups(String encodedGroups){
        if (encodedGroups.equals("[]")) { return new ArrayList<Triplet<String, String, String>>(); }
        
        ArrayList encodedGroupsList = new ArrayList<String>(Arrays.asList(encodedGroups.split("\\},\\{")));
        ArrayList<Triplet<String, String, String>> groups = new ArrayList<>();
        
        for (int i = 0; i < encodedGroupsList.size(); i++){
            groups.add(decodeGroup((String) encodedGroupsList.get(i)));
        }
        
        return groups;
    }
}

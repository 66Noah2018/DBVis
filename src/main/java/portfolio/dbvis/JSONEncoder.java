package portfolio.dbvis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import org.javatuples.Triplet;

/**
 *
 * @author RLvan
 */
public class JSONEncoder {
    public static String encodeItem(Table item) throws JsonProcessingException {
        String result = "{\"tableId\":\"" + item.getTableId() + "\",\"tableName\":\"" + item.getTableName() + "\",\"tableFields\":";
        String tableFields = "[";
        for (String field : item.getTableFields()){
            tableFields += "\"" + field + "\",";
        }
        tableFields = tableFields.substring(0, tableFields.length() - 1) + "]";
        
        result += tableFields + ",\"xCoordinate\":" + item.getXCoordinate() + ",\"yCoordinate\":" + item.getYCoordinate() + ",\"groupId\":\"" + item.getGroupId() + "\"}";        
        
        return result;
    }

    public static String encodeDatabase(LinkedList<Table> database) throws JsonProcessingException {
        if (database.size() == 0) { return "[]"; }
        String result = "[";
        
        for (int i = 0; i < database.size(); i++){
            result += encodeItem(database.get(i)) + ", ";
        }
        result = result.substring(0, result.length() - 2) + "]";
        
        return result;
    }
    
    public static String encodeGroup(Group group) throws JsonProcessingException {
        String result = "{\"groupId\":\"" + group.getGroupId() + "\",\"groupName\":\"" + group.getGroupName() + "\",\"groupColor\":\"" + group.getGroupColor() + "\",\"xCoordinate\":" + group.getXCoordinate() + ",\"yCoordinate\":" + group.getYCoordinate() + ",\"width\":" + group.getWidth() + ",\"length\":" + group.getLength() + "}";
        
        return result;
    }
    
    public static String encodeGroups(ArrayList<Group> groups) throws JsonProcessingException{
        if (groups.size() == 0) { return "[]"; }
        String result = "[";
        
        for (int i = 0; i < groups.size(); i++){
            result += encodeGroup(groups.get(i)) + ",";
        }
        result = result.substring(0, result.length() - 1);
        result += "]";
        
        return result;
    }
}



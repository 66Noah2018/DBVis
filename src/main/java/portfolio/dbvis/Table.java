package portfolio.dbvis;

import java.util.ArrayList;
import java.util.UUID;
import static java.util.UUID.randomUUID;


/**
 *
 * @author RLvan
 */
public class Table {
    private String tableId;
    private String tableName;
    private ArrayList<String> tableFields;
    private Float xCoordinate;
    private Float yCoordinate;
    private String groupId;
    
    
    public Table(String tableName, ArrayList<String> tableFields){
        UUID tableuuid = randomUUID();
        this.tableId = tableuuid.toString();
        this.tableName = tableName;
        this.tableFields = tableFields;
        this.xCoordinate = null;
        this.yCoordinate = null;
        this.groupId = null;
    }
    
    public Table(String tableId, String tableName, ArrayList<String> tableFields, String groupId){
        this.tableId = tableId;
        this.tableName = tableName;
        this.tableFields = tableFields;
        this.xCoordinate = null;
        this.yCoordinate = null;
        this.groupId = groupId;
    }
    
    public Table(String tableId, String tableName, ArrayList<String> tableFields, Float xCoordinate, Float yCoordinate, String groupId){
        this.tableId = tableId;
        this.tableName = tableName;
        this.tableFields = tableFields;
        this.xCoordinate = xCoordinate;
        this.yCoordinate = xCoordinate;
        this.groupId = groupId;
    }
    
    public String getTableName() { return this.tableName; }
    public ArrayList<String> getTableFields() { return this.tableFields; }
    public String getTableId() { return this.tableId; }
    public Float getXCoordinate() { return this.xCoordinate; }
    public Float getYCoordinate() { return this.yCoordinate; }
    public String getGroupId() { return this.groupId; }
    
    public void setXCoordinate(Float xCoordinate) { this.xCoordinate = xCoordinate; }
    public void setYCoordinate(Float yCoordinate) { this.yCoordinate = yCoordinate; }
    public void setGroupId (String groupId) { this.groupId = groupId; }
}

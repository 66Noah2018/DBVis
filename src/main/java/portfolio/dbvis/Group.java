/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package portfolio.dbvis;

import java.util.UUID;
import static java.util.UUID.randomUUID;

/**
 *
 * @author RLvan
 */
public class Group {
    private String groupId;
    private String groupName;
    private String groupColor;
    private Float xCoordinate;
    private Float yCoordinate;
    private Float width;
    private Float length;
    
    public Group (String groupName, String groupColor) {
        UUID groupuuid = randomUUID();
        this.groupId = groupuuid.toString();
        this.groupName = groupName;
        this.groupColor = groupColor;
        this.xCoordinate = null;
        this.yCoordinate = null;
        this.width = null;
        this.length = null;
    }
    
    public Group (String groupId, String groupName, String groupColor){
        this.groupId = groupId;
        this.groupName = groupName;
        this.groupColor = groupColor;
        this.xCoordinate = null;
        this.yCoordinate = null;
        this.width = null;
        this.length = null;
    }
    
    public Group (String groupId, String groupName, String groupColor, Float xCoordinate, Float yCoordinate, Float width, Float length) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.groupColor = groupColor;
        this.xCoordinate = xCoordinate;
        this.yCoordinate = yCoordinate;
        this.width = width;
        this.length = length;
    }
    
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public void setGroupColor(String groupColor) { this.groupColor = groupColor; }
    public void setXCoordinate(Float xCoordinate) { this.xCoordinate = xCoordinate; }
    public void setYCoordinate(Float yCoordinate) { this.yCoordinate = yCoordinate; }
    public void setWidth(Float width) { this.width = width; }
    public void setLength(Float length) { this.length = length; }
    
    public String getGroupName() { return this.groupName; }
    public String getGroupId() { return this.groupId; }
    public String getGroupColor() { return this.groupColor; }
    public Float getXCoordinate() { return this.xCoordinate; }
    public Float getYCoordinate() { return this.yCoordinate; }
    public Float getWidth() { return this.width; }
    public Float getLength() { return this.length; }
}

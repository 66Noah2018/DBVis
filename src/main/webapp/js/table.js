let tablePanelIds = [];
let lastX = 0;
let lastY = 20;
let maxX = 0;
let highestPanelOnLine = 0;
let selectedTableId = null;
let state = 0;
let groups = [];
let usedGroupIds = {};
let groupPanelIds = [];
const panelCaptionHeight = 42;

function callTableUpdate(event){ 
    let target = event.target;
    setSelectedItem((target.children[0].id).replace("panel-", ""), true);
    updatePosition(selectedTableId); 
}

function callGroupUpdate(event){
    let target = event.target;
    let groupId = (target.id).replace("group-panel-", "");
    updateGroupPosition(groupId);
}

function dragMoveListener (event) {
  var target = event.target;
  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

  // translate the element
  target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  // update the posiion attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

function addGroupRow(){
    let table = document.getElementById("groups-table").children[1];
    let row = table.insertRow();
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    cell1.innerHTML = '<input type="text" data-role="input" id="">';
    cell2.innerHTML = '<input type="color" data-role="input">';
}

function setSelectedItem (tableId, sourceMove = false){
    if (!sourceMove) {
        if (selectedTableId === tableId) {
            selectedTableId = null;
            document.getElementById("panel-" + tableId).parentNode.classList.remove("selected-table");
            return;
        }
    }
    
    if (selectedTableId !== null) { document.getElementById("panel-" + selectedTableId).parentNode.classList.remove("selected-table"); }
    selectedTableId = tableId;
    document.getElementById("panel-" + selectedTableId).parentNode.classList.add("selected-table");
}

function showAllTableDetails(){
    tablePanelIds.forEach(panel => {
        document.getElementById(panel).style.display="block";
        document.getElementById(panel).classList.remove("collapsed");
    });
}

function hideAllTableDetails(){
    tablePanelIds.forEach(panel => {
        document.getElementById(panel).style.display="none";
        document.getElementById(panel).classList.add("collapsed");
    });
}

function tableToHTML (tableId, tableName, fieldList){ 
    let table = `
        <div class="databaseTable" id="${tableId}" onclick="setSelectedItem('${tableId}')">
            <table class="table subcompact table-border row-border cell-border">
                
                <tbody>
        `;
    
    fieldList.forEach(field => {
        let fieldSplit = field.split(" ");
        let fieldCaps = fieldSplit.shift();
        fieldSplit.forEach(field => { fieldCaps += " " + field.toUpperCase(); });
        let pKey = "";
        if (field.toUpperCase().includes("PRIMARY KEY")) { pKey = "<span class=mif-key></span>" };
        table += "<tr><td>" + pKey + "</td><td>" + fieldCaps + "</td></tr>\n";
    });
    
    table += "</tbody></table></div>";
    
    return table;   
}

async function updatePosition(tableId){
    const panel = document.getElementById("panel-" + tableId).parentNode;
    let xCoordinate = panel.style.left;
    let yCoordinate = panel.style.top;
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "./dbvisservlet?function=setCoordinates", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(JSON.stringify({
        "panelId": "panel-" + tableId,
        "x": parseFloat(xCoordinate.replace("px", "")),
        "y": parseFloat(yCoordinate.replace("px", ""))
    }));
    http.onload = async function(){
        state = JSON.parse(http.responseText).state;
        // check if in group, if so updateGroupDimensions
        const tableData = state.filter(table => table.tableId === tableId)[0];
        if (tableData.groupId !== "null" && tableData.groupId !== null) {
           await updateGroupDimensions(tableData.groupId);
        }
        console.log(tableData);
    };
}

function positionPanel(xCoordinate, yCoordinate){ // either all panels have coordinates, or none have. therefore this approach is safe
    const panels = document.getElementsByClassName("panel");
    let latestPanel = panels.item(panels.length - 1);
    latestPanel.style.width = "fit-content";
    
    if (xCoordinate === null || yCoordinate === null || xCoordinate === "null" || yCoordinate === "null") {
        let newX = lastX + 20;
        let panelWidth = latestPanel.getBoundingClientRect().width;
        let newY = lastY;
        if ((newX + panelWidth) > maxX) {
            newX = 20;
            newY = lastY + highestPanelOnLine + 20;
            highestPanelOnLine = 0;
        }
        latestPanel.style.left = newX + "px";
        latestPanel.style.top = newY + "px";
        highestPanelOnLine = Math.max(highestPanelOnLine, latestPanel.getBoundingClientRect().height);
        lastX = newX + panelWidth;
        lastY = newY;
        
        // update state
        const panelId = latestPanel.children.item(0).id;
        const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
        http.open("POST", "./dbvisservlet?function=setCoordinates", true);
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.send(JSON.stringify({
            "panelId": panelId,
            "x": newX,
            "y": newY
        }));
    } else {
        latestPanel.style.left = xCoordinate + "px";
        latestPanel.style.top = yCoordinate + "px";
    }
}

function drawTables(tables) {
    usedGroupIds = {};
    tables.forEach(table => {
        let div = document.createElement('div');
        div.setAttribute("data-role", "panel");
        div.setAttribute("data-title-caption", table.tableName);
        div.setAttribute("data-collapsible", "true");
        div.setAttribute("data-width", "fit-content");
        div.setAttribute("data-height", "fit-content");
        div.setAttribute("data-on-panel-create", "positionPanel(" + table.xCoordinate + ", " + table.yCoordinate + ");");
        div.setAttribute("id", "panel-" + table.tableId);
        div.classList.add("table-panel");
        tablePanelIds.push("panel-" + table.tableId);
        div.style.width = "fit-content";
        div.innerHTML = tableToHTML(table.tableId, table.tableName, table.tableFields);
        document.getElementById("database-vis").appendChild(div);
        if (table.groupId !== "null" && table.groupId !== null) { 
            if (!usedGroupIds.hasOwnProperty(table.groupId)) { usedGroupIds[table.groupId] = []; }
            usedGroupIds[table.groupId].push(table.tableId);
        }
    });
    
    createGroupDropdown();
}

function positionGroup(xCoordinate, yCoordinate, width, length, groupId) {
    // assumption: if there are groups used, there must be coordinates as well
    const panels = document.getElementsByClassName("panel");
    let latestPanel = panels.item(panels.length - 1);
    latestPanel.setAttribute("id", "group-panel-" + groupId);
    latestPanel.style.left = xCoordinate + "px";
    latestPanel.style.top = yCoordinate + "px";
    const http = new XMLHttpRequest();
    http.open("POST", "./dbvisservlet?function=setGroupLocationAttributes", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(JSON.stringify({
        "groupId": groupId,
        "xCoordinate": xCoordinate,
        "yCoordinate": yCoordinate,
        "width": width,
        "length": length
    }));
    http.onload = function(){
        response = JSON.parse(http.responseText);
        groups = response.groups;
        console.log(groups);
    };
}

function updateGroupPosition(groupId){
    const panel = document.getElementById("group-panel-" + groupId);
    const regex = /translate\((.*)px,(.*)px\)/gm;
    const results = regex.exec(panel.style.transform);
    const diffX = parseFloat(results[1]);
    const diffY = parseFloat(results[2]);
    groups = JSON.parse(servletRequest("./dbvisservlet?function=getGroups")).groups;
    const groupData = groups.filter(group => group.groupId === groupId)[0];
    const xCoordinate = groupData.xCoordinate;
    const yCoordinate = groupData.yCoordinate;
    const width = groupData.width; // width and length don't change if we move a panel
    const length = groupData.length;
    const newX = parseFloat((panel.style.left).replace("px", "")) + diffX;
    const newY = parseFloat((panel.style.top).replace("px", "")) + diffY;
    panel.style.left = newX + "px";
    panel.style.top = newY + "px";
    panel.style.transform = "translate(0px, 0px)";
    // update state
    const http = new XMLHttpRequest();
    http.open("POST", "./dbvisservlet?function=setGroupLocationAttributes", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(JSON.stringify({
        "groupId": groupId,
        "xCoordinate": newX,
        "yCoordinate": newY,
        "width": width,
        "length": length
    }));
    http.onload = function(){
        response = JSON.parse(http.responseText);
        groups = response.groups;
        // move tables in this group
        const tablesToMove = usedGroupIds[groupId];
        tablesToMove.forEach(tableId => {
            let tablePanel = document.getElementById("panel-" + tableId).parentElement;
            const http = new XMLHttpRequest();
            const currX = parseFloat((tablePanel.style.left).replace("px", ""));
            const currY = parseFloat((tablePanel.style.top).replace("px", ""));
            const newTableX = currX + diffX;
            const newTableY = currY + diffY;
            console.log(newTableX, newTableY);
            tablePanel.style.left = newTableX + "px";
            tablePanel.style.top = newTableY + "px";
            // update table data
            http.open("POST", "./dbvisservlet?function=setCoordinates", true);
            http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            http.send(JSON.stringify({
                "panelId": "panel-" + tableId,
                "x": newTableX,
                "y": newTableY
            }));
        });
        state = JSON.parse(servletRequest("./dbvisservlet?function=getState")).state;
    };
}

async function drawGroups(groupIds) {
    groupPanelIds = [];
    for (const groupId in groupIds) {
        const panel = document.getElementById("group-panel-" + groupId);
        if (panel !== undefined && panel !== null){ // delete old panel if exists
            panel.remove();
        }
        const group = groups.filter(group => group.groupId === groupId)[0];
        let div = document.createElement('div');
        div.setAttribute("data-role", "panel");
        div.setAttribute("data-title-caption", group.groupName);
        div.setAttribute("data-collapsible", "true");
        div.setAttribute("data-on-panel-create", "positionGroup(" + group.xCoordinate + ", " + group.yCoordinate + ", " + group.width + ", " + group.length + ", \"" + group.groupId + "\");");
        div.setAttribute("id", "group-" + group.groupId);
        div.style.backgroundColor = group.groupColor;
        div.style.minHeight = "100px";
        div.style.minWidth = "200px";
        div.style.width = group.width + "px";
        div.style.height = group.length + "px";
        div.classList.add("group-panel");
        groupPanelIds.push("group-" + group.groupId);
        await document.getElementById("database-vis").appendChild(div);
    }
}

function loadDatabase(){ 
    maxX = document.getElementById("database-vis").offsetWidth;
    tablePanelIds = [];
    state = JSON.parse(servletRequest("./dbvisservlet?function=getState")).state;
    groups = JSON.parse(servletRequest("./dbvisservlet?function=getGroups")).groups;
    console.log(state);
    drawTables(state);
    drawGroups(usedGroupIds);
}

function createGroupDropdown(){
    groups = JSON.parse(servletRequest("./dbvisservlet?function=getGroups")).groups;
    let dropdownList = document.getElementById("groups-dropdown-list");
    dropdownList.innerHTML = "";
    groups.forEach( group => {
        let li = document.createElement("li");
        li.setAttribute("onclick", `addToGroup(\"${group.groupId}\")`);
        li.setAttribute("class", "group-dropdown-li");
        li.innerHTML = group.groupName;
        dropdownList.appendChild(li);
    });
}

async function addToGroup(groupId){ // TODO: option: remove table from group --> option for no groups? separate button for no groups?
    // if group is already drawn, only move table, update dimensions and check other tables
    if (selectedTableId === null) { return; }
    const oldTableData = state.filter(table => table.tableId === selectedTableId)[0];
    result = JSON.parse(servletRequest("./dbvisservlet?function=addToGroup&tableId=" + selectedTableId + "&groupId=" + groupId));
    state = result.state;
    groups = result.groups;
    if (!usedGroupIds.hasOwnProperty(groupId)) { usedGroupIds[groupId] = []; }
    usedGroupIds[groupId].push(selectedTableId);
    
    if (usedGroupIds[groupId].length === 1) {
        // draw group
        await drawGroups(usedGroupIds);
    }
    moveTableIntoGroup(groupId);
    
    // change group size
    await updateGroupDimensions(groupId);
    
    if (oldTableData.groupId !== "null" && oldTableData.groupId !== null) {
        usedGroupIds[oldTableData.groupId] = (usedGroupIds[oldTableData.groupId].filter(tableId => tableId !== selectedTableId));
        await updateGroupDimensions(oldTableData.groupId);
        // check if old group is now empty -> if so delete
        if (usedGroupIds[oldTableData.groupId] === []) {
            document.getElementById("group-panel-" + oldTableData.groupId).remove();
        }
    }
}

function moveTableIntoGroup(groupId){
    // move table into group panel
    let tablePanel = document.getElementById("panel-" + selectedTableId).parentElement;
    let group = groups.filter(group => group.groupId === groupId)[0];
    let table = state.filter(table => table.tableId === selectedTableId)[0];
    let tableXMin = table.xCoordinate;
    let tableXMax = table.xCoordinate + tablePanel.getBoundingClientRect().width;
    let tableYMin = table.yCoordinate;
    let tableYMax = table.yCoordinate + tablePanel.getBoundingClientRect().height;
    const groupXMin = group.xCoordinate;
    const groupXMax = group.xCoordinate + group.width;
    const groupYMin = group.yCoordinate;
    const groupYMax = group.yCoordinate + group.length + panelCaptionHeight;
    if (((tableYMax < groupYMin && tableYMax >= groupYMax) || (tableYMin < groupYMin && tableYMin > groupYMax)) &&
                ((tableXMax < groupXMin && tableXMax > groupXMax) || (tableXMin < groupXMin && tableXMin > groupXMax))){
            console.log("moving table");
            tableYMin = groupYMin + 10;
            tablePanel.style.top = tableYMin + "px";
            tableXMin = groupXMin + 10;
            tablePanel.style.left = tableXMin + "px";
        }
}

function moveOtherTables (groupId) {
    // make sure all tables that are not in this group are not drawn over it
    const tablesInGroup = usedGroupIds[groupId];
    const tablesOutsideOfGroup = state.filter(table => !tablesInGroup.includes(table.tableId));
    const group = groups.filter(group => group.groupId === groupId)[0];
    const groupXMin = group.xCoordinate;
    const groupXMax = group.xCoordinate + group.width;
    const groupYMin = group.yCoordinate;
    const groupYMax = group.yCoordinate + group.length + panelCaptionHeight;
    tablesOutsideOfGroup.forEach(table => {
        const tableId = table.tableId;
        const tablePanel = document.getElementById("panel-" + tableId).parentElement;
        let tableXMin = table.xCoordinate;
        let tableXMax = tableXMin + tablePanel.getBoundingClientRect().width;
        let tableYMin = table.yCoordinate;
        let tableYMax = tableYMin + tablePanel.getBoundingClientRect().height;
        
        if (((tableYMax >= groupYMin && tableYMax < groupYMax) || (tableYMin >= groupYMin && tableYMin <= groupYMax)) &&
                ((tableXMax >= groupXMin && tableXMax < groupXMax) || (tableXMin >= groupXMin && tableXMin <= groupXMax))){
            tableYMin = groupYMax + 20;
            tablePanel.style.top = tableYMin + "px";
            tableXMin = groupXMax + 20;
            tablePanel.style.left = tableXMin + "px";
        }
        
        const http = new XMLHttpRequest(); 
        http.open("POST", "./dbvisservlet?function=setCoordinates", true);
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.send(JSON.stringify({
            "panelId": "panel-" + tableId,
            "x": tableXMin,
            "y": tableYMin
        }));
    });
    state = JSON.parse(servletRequest("./dbvisservlet?function=getState")).state;
}

async function updateGroupDimensions (groupId){
    const tablesInGroup = usedGroupIds[groupId];
    const group = groups.filter(group => group.groupId = groupId);
    const leftOffset = group.xCoordinate;
    const topOffset = group.yCoordinate + panelCaptionHeight;
    let neededWidth = 0;
    let neededLength = 0;
    let maxTableX = 0; // using infinity saves us a null check
    let maxTableY = 0;
    let minTableX = Infinity;
    let minTableY = Infinity;
    tablesInGroup.forEach(tableId => {
        let table = state.filter(table => table.tableId === tableId)[0];
        let tablePanel = document.getElementById("panel-" + tableId).parentElement;
        let tableXMin = table.xCoordinate;
        let tableXMax = table.xCoordinate + tablePanel.getBoundingClientRect().width;
        let tableYMin = table.yCoordinate;
        let tableYMax = table.yCoordinate + tablePanel.getBoundingClientRect().height;
        maxTableX = Math.max(maxTableX, tableXMax);
        maxTableY = Math.max(maxTableY, tableYMax);
        minTableX = Math.min(minTableX, tableXMin);
        minTableY = Math.min(minTableY, tableYMin);
    });  
    neededWidth = maxTableX - minTableX + 20;
    neededLength = maxTableY - minTableY + 20;
    const newLeftOffset = Math.max(0, (minTableX - 10));
    const newTopOffset = Math.max(0, (minTableY - 10) - panelCaptionHeight);
    // update state
    const http = new XMLHttpRequest(); 
    http.open("POST", "./dbvisservlet?function=setGroupLocationAttributes", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(JSON.stringify({
        "groupId": groupId,
        "xCoordinate": newLeftOffset,
        "yCoordinate": newTopOffset,
        "width": neededWidth,
        "length": neededLength
    }));
    http.onload = function(){
        // show group updates in visualizer
        let groupPanelContent = document.getElementById("group-" + groupId);
        let groupPanel = document.getElementById("group-panel-" + groupId);
        groupPanelContent.style.width = neededWidth + 5 + "px";
        groupPanelContent.style.height = neededLength + 5 + "px";
        groupPanel.style.top = newTopOffset + "px";
        groupPanel.style.left = newLeftOffset + "px";
        response = http.responseText;
        groups = JSON.parse(response).groups;
        console.log(groups);
        moveOtherTables(groupId);
    };
}

function servletRequest(url){
    const http = new XMLHttpRequest();
    http.open("GET", url, false);
    http.send();
    if (http.readyState === 4 && http.status === 200) {
        return http.responseText;
    }
}

function showGroupForm(){
    const groups = JSON.parse(servletRequest("./dbvisservlet?function=getGroups")).groups;
    let table = document.getElementById("groups-table").children[1];
    table.innerHTML = "";
    
    groups.forEach(group => {
        let row = table.insertRow();
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        cell1.innerHTML = '<input type="text" data-role="input" value="' + group.groupName + '" id="' + group.groupId + '">';
        cell2.innerHTML = '<input type="color" data-role="input" value="' + group.groupColor + '">';
    });
    addGroupRow();  
    
    document.getElementsByClassName("group-form")[0].style.display = "block";
}

function saveGroups(){
    document.getElementsByClassName("group-form")[0].style.display = "none";
    let groups = "{\"groups\":[";
    let rows = Array.from(document.getElementById("groups-table").rows);
    rows.shift();
    rows.forEach(row => {
        let rowCells = row.cells;
        let name = rowCells[0].children[0].children[0].value;
        let color = rowCells[1].children[0].children[0].value;
        let id = rowCells[0].children[0].children[0].getAttribute("ïd");
        if (id === "") { id = null; }
        // todo: add support for coordinates and dimensions
        
        
        if (name !== "") {
            groups += "{\"groupId\":\"" + id + "\",\"groupName\":\"" + name + "\",\"groupColor\":\"" + color + "\",\"xCoordinate\":null,\"yCoordinate\":null,\"width\":null,\"length\":null},";
        }
    });
    
    groups = groups.substring(0, groups.length - 1) + "]}";
    console.log(groups);
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "./dbvisservlet?function=setGroups", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(groups);
    http.onload = function(){ 
        state = JSON.parse(servletRequest("./dbvisservlet?function=getState")).state;
        location.reload();
        drawTables(state);
    };
}

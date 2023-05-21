let tablePanelIds = [];
let lastX = 0;
let lastY = 20;
let maxX = 0;
let highestPanelOnLine = 0;
let selectedTableId = null;
let state = 0;

function addGroupRow(){
    let table = document.getElementById("groups-table").children[1];
    let row = table.insertRow();
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    cell1.innerHTML = '<input type="text" data-role="input">';
    cell2.innerHTML = '<input type="color" data-role="input">';
}

function setSelectedItem (tableId){
    if (selectedTableId === tableId) {
        selectedTableId = null;
        document.getElementById("panel-" + tableId).parentNode.classList.remove("selected-table");
        return;
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
        fieldSplit.forEach(field => { fieldCaps += " " + field.toUpperCase(); })
        let pKey = "";
        if (field.toUpperCase().includes("PRIMARY KEY")) { pKey = "<span class=mif-key></span>" }
        table += "<tr><td>" + pKey + "</td><td>" + fieldCaps + "</td></tr>\n";
    });
    
    table += "</tbody></table></div>";
    
    return table;   
}

function updatePosition(tableId){
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
}

function positionPanel(xCoordinate, yCoordinate){ // either all panels have coordinates, or none have. therefore this approach is safe
    const panels = document.getElementsByClassName("panel");
    let latestPanel = panels.item(panels.length - 1);
    
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
        console.log(xCoordinate, yCoordinate);
        latestPanel.style.left = xCoordinate + "px";
        latestPanel.style.top = yCoordinate + "px";
    }
}

function drawTables(tables) {
    tables.forEach(table => {
        let div = document.createElement('div');
        div.setAttribute("data-role", "panel");
        div.setAttribute("data-title-caption", table.tableName);
        div.setAttribute("data-collapsible", "true");
        div.setAttribute("data-draggable", "true");
        div.setAttribute("data-drag-area", "#database-vis");
        div.setAttribute("data-on-panel-create", "positionPanel(" + table.xCoordinate + ", " + table.yCoordinate + ");");
        div.setAttribute("data-on-drag-stop", "updatePosition(\"" + table.tableId + "\");");
        div.setAttribute("id", "panel-" + table.tableId);
        tablePanelIds.push("panel-" + table.tableId);
        div.style.width = "fit-content";
        div.innerHTML = tableToHTML(table.tableId, table.tableName, table.tableFields);
        document.getElementById("database-vis").appendChild(div);
    });
    
    createGroupDropdown();
}

function loadDatabase(){ 
    maxX = document.getElementById("database-vis").offsetWidth;
    tablePanelIds = [];
    state = JSON.parse(servletRequest("./dbvisservlet?function=getState")).state;
    drawTables(state);
}

function createGroupDropdown(){
    const groups = JSON.parse(servletRequest("./dbvisservlet?function=getGroups")).groups;
    let dropdownList = document.getElementById("groups-dropdown-list");
    dropdownList.innerHTML = "";
    groups.forEach( group => {
        let li = document.createElement("li");
        li.setAttribute("onclick", `addToGroup(\"${group.groupId}\")`);
        li.setAttribute("class", "group-dropdown-li");
        li.innerText = group.groupName;
        dropdownList.appendChild(li);
    });
}

function addToGroup(groupId){
    if (selectedTableId === null) { return; }
    state = JSON.parse(servletRequest("./dbvisservlet?function=addToGroup&tableId=" + selectedTableId + "&groupId=" + groupId)).state;
    location.reload();
    drawTables(state);
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
        cell1.innerHTML = '<input type="text" data-role="input" value="' + group.groupName + '">';
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
        if (name !== "") {
            groups += "{\"groupId\": \"null\", \"groupName\": \"" + name + "\", \"groupColor\": \"" + color + "\"},";
        }
    });
    
    groups = groups.substring(0, groups.length - 1) + "]}";
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

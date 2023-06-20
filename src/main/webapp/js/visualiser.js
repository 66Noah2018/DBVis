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
let foreignKeys = {};
let leaderlines = [];

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

function repositionLeaderLines() {
    for (let line of leaderlines) { line.position(); }
}

function drawForeignKeys() {
    for (let key in foreignKeys) {
        const tableName = state.filter(table => table.tableId === key)[0].tableName;
        const statements = foreignKeys[key];
        for (let statement of statements) {
            const fields = (statement.toLowerCase()).match(/foreign key\s?\((.*?)\) references (.*?)\s?\((.*?)\)/);
            if (fields !== null) {
                const field_curr_table = fields[1];
                const references_table = fields[2];
                const references_field = fields[3];
                const startEl = document.getElementById(tableName + "-" + field_curr_table);
                const endEl = document.getElementById(references_table + "-" + references_field);
                let line = new LeaderLine(startEl, endEl);
                leaderlines.push(line);
            }
        }
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
    drawForeignKeys();
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

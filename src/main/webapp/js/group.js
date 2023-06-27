function callGroupUpdate(event){
    let target = event.target;
    let groupId = (target.id).replace("group-panel-", "");
    updateGroupPosition(groupId);
}

function addGroupRow(){
    let table = document.getElementById("groups-table").children[1];
    let row = table.insertRow();
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    cell1.innerHTML = '<input type="text" data-role="input" id="">';
    cell2.innerHTML = '<input type="color" data-role="input">';
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
        repositionLeaderLines();
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
    const width = parseFloat((panel.children[0].style.width).replace("px", "")); 
    const length = parseFloat((panel.children[0].style.height).replace("px", ""));
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
            repositionLeaderLines();
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
        tableYMin = groupYMin + panelCaptionHeight + 10;
        tablePanel.style.top = tableYMin + "px";
        tableXMin = groupXMin + 10;
        tablePanel.style.left = tableXMin + "px";
    } else {
        tablePanel.style.top = Math.max(tableYMin, (groupYMin + panelCaptionHeight + 10)) + "px";
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


function callTableUpdate(event){ 
    let target = event.target;
    setSelectedItem((target.children[0].id).replace("panel-", ""), true);
    updatePosition(selectedTableId); 
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
        let fieldName = field.split(" ")[0];
        table += "<tr><td id='" + tableName + "-" + fieldName + "'>" + pKey + "</td><td>" + fieldCaps + "</td></tr>\n";
    });
    
    table += "</tbody></table></div>";
    
    return table;   
}

async function updatePosition(tableId){
    const panel = document.getElementById("panel-" + tableId).parentNode;
    const regex = /translate\((.*)px,(.*)px\)/gm;
    const results = regex.exec(panel.style.transform);
    const diffX = parseFloat(results[1]);
    const diffY = parseFloat(results[2]);
    const tableData = state.filter(table => table.tableId === tableId)[0];
    const xCoordinate = tableData.xCoordinate;
    const yCoordinate = tableData.yCoordinate;
    const newX = parseFloat((panel.style.left).replace("px", "")) + diffX;
    const newY = parseFloat((panel.style.top).replace("px", "")) + diffY;
    panel.style.left = newX + "px";
    panel.style.top = newY + "px";
    panel.style.transform = "translate(0px, 0px)";
    
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "./dbvisservlet?function=setCoordinates", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(JSON.stringify({
        "panelId": "panel-" + tableId,
        "x": newX,
        "y": newY
    }));
    http.onload = async function(){
        state = JSON.parse(http.responseText).state;
        console.log(state);
        // check if in group, if so updateGroupDimensions
        const tableData = state.filter(table => table.tableId === tableId)[0];
        if (tableData.groupId !== "null" && tableData.groupId !== null) {
           await updateGroupDimensions(tableData.groupId);
        }
        repositionLeaderLines();
        
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
    repositionLeaderLines();
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
        const keys = table.foreignKeys;
        if (keys[0] !== "") { // not the right solution obv, try to find where it goes wrong (somewhere in the JSON.parse, it's fine in the file)
            foreignKeys[table.tableId] = keys;
        }
    });
    
    createGroupDropdown();
}


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

function updatePosition(tableId){
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
    
    const response = servletRequestPost("./dbvisservlet?function=setCoordinates", {
        "panelId": "panel-" + tableId,
        "x": newX,
        "y": newY
    });
//    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
//    http.open("POST", "./dbvisservlet?function=setCoordinates", true);
//    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
//    http.onload = async function(){
        state = JSON.parse(response).state;
        console.log(state);
        // check if in group, if so updateGroupDimensions
//        const tableData = state.filter(table => table.tableId === tableId)[0];
        if (tableData.groupId !== "null" && tableData.groupId !== null) {
           updateGroupDimensions(tableData.groupId);
        }
        repositionLeaderLines();
        
//    };
//    http.send(JSON.stringify({
//        "panelId": "panel-" + tableId,
//        "x": newX,
//        "y": newY
//    }));
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
        servletRequestPost("./dbvisservlet?function=setCoordinates", {
            "panelId": panelId,
            "x": newX,
            "y": newY
        });
//        const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
//        http.open("POST", "./dbvisservlet?function=setCoordinates", true);
//        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
//        http.send(JSON.stringify({
//            "panelId": panelId,
//            "x": newX,
//            "y": newY
//        }));
    } else {
        latestPanel.style.left = xCoordinate + "px";
        latestPanel.style.top = yCoordinate + "px";
    }
    repositionLeaderLines();
}

function createPanelElement(tableCode, table){
    let div = document.createElement("div");
    div.classList.add("panel");
    div.classList.add("panel-default");
    div.classList.add("table-panel");
    div.innerHTML = `
        <div class='panel-heading' id="panel-${table.tableId}">
            <div class='panel-title'>${table.tableName}</div>
            <button class='panel-arrow' onclick='togglePanelContent("panel-${table.tableId}");'>
                <span class='mif-chevron-thin-up'></span>
            </button>
        </div>
        <div class='panel-body' style="display:block;">${tableCode}</div>
    `;
    document.getElementById("database-vis").appendChild(div);
    positionPanel(table.xCoordinate, table.yCoordinate);
}

function togglePanelContent(panelId, forceClose = false, forceOpen = false){
    const panel = document.getElementById(panelId).parentElement;
    let panelContent = panel.children.item(1);
    const displayState = panelContent.style.display;
    let panelArrow = panel.children.item(0).children.item(1);
    if (displayState === "block" || forceClose) { 
        panelContent.style.display = "none"; 
        panelArrow.style.webkitTransform = 'rotate(180deg)';
        panelArrow.style.mozTransform = 'rotate(180deg)';
        panelArrow.style.msTransform = 'rotate(180deg)';
        panelArrow.style.oTransform = 'rotate(180deg)';
        panelArrow.style.transform = 'rotate(180deg)';
    }
    else if (displayState === "none" || forceOpen) { 
        panelContent.style.display = "block"; 
        panelArrow.style.webkitTransform = 'rotate(0deg)';
        panelArrow.style.mozTransform = 'rotate(0deg)';
        panelArrow.style.msTransform = 'rotate(0deg)';
        panelArrow.style.oTransform = 'rotate(0deg)';
        panelArrow.style.transform = 'rotate(0deg)';
    }
}

function drawTables(tables) {
    usedGroupIds = {};
    tables.forEach(table => {
        createPanelElement(tableToHTML(table.tableId, table.tableName, table.tableFields), table);
        tablePanelIds.push("panel-" + table.tableId);
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


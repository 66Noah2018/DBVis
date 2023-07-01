let recentlyOpened = {};
let invalidForm = false;
let properties = null;
let parser = new DOMParser();

const infoBoxProperties = {
    warning: {animation: 'easeOutBounce', cls: "edit-notify"},
    warningKeepOpen: {animation: 'easeOutBounce', cls: "edit-notify", keepOpen: true},
    success: {animation: 'easeOutBounce', cls: "save-success"},
    error: {anymation: 'easeOutBounce', cls: "info-box-error"}
};

function valuesToJson(title, databaseFileName, workingDir){
    const obj = { 
        "title": title, 
        "databaseFileName": databaseFileName, 
        "workingDir": workingDir
    };
    return JSON.stringify(obj);
}

function checkDirValidity(){
    event.preventDefault();
    let targetBtn = document.getElementById("checkDirBtn");
    targetBtn.classList.remove("success");
    targetBtn.classList.remove("alert");
    let directory = document.getElementById("workingDirectory").value;
    
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "../dbvisservlet?function=directoryExists", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
    http.onload = function(){ 
        directoryExists = JSON.parse(http.responseText).directoryExists;
        if (directoryExists && directory !== "") { 
            targetBtn.classList.add("success"); 
            document.getElementById("selected-working-dir-edit").style.visibility = 'hidden';
        } 
        else { 
            targetBtn.classList.add("alert"); 
            document.getElementById("selected-working-dir-edit").style.visibility = 'visible';
        }
    };
    http.send(JSON.stringify(directory));
}

function checkDefaultDirValidity(){
    event.preventDefault();
    let targetBtn = document.getElementById("checkDirBtn");
    targetBtn.classList.remove("success");
    targetBtn.classList.remove("alert");
    let directory = document.getElementById("defaultWorkingDirectory").value;
    
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "../dbvisservlet?function=directoryExists", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
    http.onload = function(){ 
        directoryExists = JSON.parse(http.responseText).directoryExists;
        if (directoryExists && directory !== "") { 
            targetBtn.classList.add("success"); 
            document.getElementById("selected-working-dir-edit").style.visibility = 'hidden';
        } 
        else { 
            targetBtn.classList.add("alert"); 
            document.getElementById("selected-working-dir-edit").style.visibility = 'visible';
        }
    };
    http.send(JSON.stringify(directory));
}

function displayErrorMessage(formGroupId, errorMessage){
    document.getElementById(formGroupId).innerText = errorMessage;
    invalidForm = true;
}

function clearErrorMessages(){
    document.getElementById("selected-working-dir-edit").style.visibility = 'hidden';
    const groupsToClear = ["title-group"];
    groupsToClear.forEach((group) => { document.getElementById(group).innerText = ""; });
}

function editProject(isNew = false){
    document.getElementById("create-project-load").style.display = "block";
    if (isNew) { properties = null; }
    invalidForm = false;
//    clearErrorMessages();
    if (!document.getElementById("checkDirBtn").classList.contains("success")){
        document.getElementById("selected-working-dir-edit").style.visibility = "visible";
    }
    let formdata = new FormData(document.getElementById("edit-properties"));
    let projectTitle = formdata.get("title");
    const databaseFileName = document.getElementById("databaseFileUpload").value.split("path\\")[1];
    let workingDir = formdata.get("workingDirectory");
    
    const specialChars = /[`!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/;
    // form value checks
    
    if (projectTitle === "") { displayErrorMessage("title-group", "Title cannot be empty"); invalidForm = true; }
    if (databaseFileName === undefined) { displayErrorMessage("database-group", "Please select a database file to use"); invalidForm = true; }
    let dirBtnClassList = document.getElementById("checkDirBtn").classList;
    if (!dirBtnClassList.contains("success")) { document.getElementById("selected-working-dir-edit").style.visibility = "block"; invalidForm = true; }
    
    
    if (invalidForm) { return; }
    
    const projectJson = valuesToJson(projectTitle, databaseFileName, workingDir);
    servletRequestPost("../dbvisservlet?function=setWorkingDirectory", workingDir);
    const url = "../dbvisservlet?function=editProject&isNew=" + isNew;
    const http = new XMLHttpRequest(); 
    http.open("POST", url, true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
    http.onload = function(){
        document.getElementById("create-project-load").style.display = "hidden";
        window.location.href = "../index.html";
    }; 
    http.send(JSON.stringify(projectJson));
}

function editProjectProperties(){
    properties = JSON.parse(servletRequest("../dbvisservlet?function=getProjectProperties"));
    if (properties !== null){
        document.getElementById("checkDirBtn").classList.add("success"); 
        document.getElementById("selected-working-dir-edit").style.visibility = 'hidden';
        document.getElementById("title").value = properties.title;
        document.getElementById("selected-databasefile-group").innerText = "Selected database file: " + properties.databaseFileName;
        document.getElementById("workingDirectory").value = properties.workingDir;
    }   
}

/**
 * 
 * 
 * @returns {null}
 */
function openProject(){
    const projectName = document.getElementById("openProjectFileUpload").value.split("path\\")[1];
    processOpen(projectName);
}

function readDatabaseFromFile(){
    const databaseFileName = document.getElementById("databaseFileUpload").value.split("path\\")[1];
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "../dbvisservlet?function=readDatabase", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.send(JSON.stringify(databaseFileName));
}

function processOpen(projectName){
    let target = document.getElementById("open-project-load");
    target.style.display = "block";
    const http = new XMLHttpRequest(); // servletrequestpost doesnt work here, loading response somehow takes too long
    http.open("POST", "../dbvisservlet?function=open", true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
    http.onload = function(){ 
        let returnValue = JSON.parse(http.responseText).response;
        target.style.display = "none";
        
        if (returnValue === "Unsupported OS"){ displayQueryInfoBox(infoBoxProperties.warning, "Warning: unsupported OS", "The detected OS is not supported");}
        else if (returnValue === "Invalid file, not DBVis" || returnValue === "File is not MIKAT file"){displayQueryInfoBox(infoBoxProperties.warning, "Warning: Not MIKAT", "The selected file is not a MIKAT project"); }
        else if (returnValue === "Invalid file, no path"){ displayQueryInfoBox(infoBoxProperties.warning, "Warning: File not found", "The selected file could not be found"); }
        else if (returnValue === "File opened successfully"){
            console.log("redirecting");
            window.location.href = "../index.html";
        }
    };
    http.send(JSON.stringify(projectName));
}

/**
 * 
 * @param {type} node
 * @returns {undefined}
 */
function openRecentProject(file){
    let prevOpened = JSON.parse(servletRequest("../dbvisservlet?function=getPrevOpened"));
    console.log(prevOpened);
    let path = prevOpened.filter((item) => item.fileName === file)[0].path;
    processOpen(path);
}

/**
 * 
 * 
 * @returns {null}
 */
function saveProject(){
    servletRequest("./dbvisservlet?function=saveProject");
//    servletRequest("http://localhost:8080/katool/dbvisservlet?function=saveProject");
//    if (!isFixedSidebar) {
//       window.location.href = "http://localhost:8080/katool/index.html"; 
//    }
//    else {
//        parent.window.location.href = "http://localhost:8080/katool/index.html"; 
//    }
}

/**
 * 
 * @returns {null}
 */
function editProperties(){}

/**
 * 
 * @returns {null}
 */
function exportAsArden(){}

/**
 * 
 * @returns {null}
 */
function preferences(){}

function servletRequestPost(url, body) {
    const http = new XMLHttpRequest();
    let response = null;
    http.open("POST", url, true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
    http.onreadystatechange = function(){ 
        console.log(http.readyState);
        while (http.readyState !== 4) {}
        if (http.readyState === 4) {
            console.log(http.responseText);
            response = http.responseText;
//            console.log("set response")
        }
    };
    http.send(JSON.stringify(body));
    while (response === null) {}
    return response;
}

function showSelectedDir(location){
    event.preventDefault();
    const firstFile = event.target.files[0].webkitRelativePath; //folder/file
    const regex = /(.+)\/.+/gm;
    const folder = regex.exec(firstFile)[1];
    document.getElementById(`selected-working-dir-${location}`).innerText = "Selected working directory: " + folder;
}

function removeClassesFromDirBtn(){
    let dirBtn = document.getElementById("checkDirBtn");
    dirBtn.classList.remove("error");
    dirBtn.classList.remove("success");
}

function showPrevOpened(){
    let prevOpened = JSON.parse(servletRequest("../dbvisservlet?function=getPrevOpened"));
    let target = document.getElementById("prevOpenedList");
    let listCode = `<ul data-role="listview" data-view="table" data-select-node="true" data-structure='{"fileName": true, "lastEdited": true}'>`;
    target.innerHTML = "";
    prevOpened.forEach((item) => {
        listCode += `<li data-icon="<span class='far fa-file-alt'>"
                    data-caption="${item.fileName}"
                    data-fileName="${item.path}"
                    data-lastEdited="${item.date}"
                    id="fileName" ondblclick='openRecentProject("${item.fileName}")'></li>`;
    });
    target.appendChild(parser.parseFromString(listCode, 'text/html').body.firstChild);
}

function showDefaultWorkingDir(){
    let defaultWorkingDirectory = JSON.parse(servletRequest("../dbvisservlet?function=getDefaultWorkingDirectory")).defaultWorkingDirectory.replaceAll("\\\\", "\\");
    if (defaultWorkingDirectory === "null") { defaultWorkingDirectory = ""; }
    document.getElementById("workingDirectory").value = defaultWorkingDirectory;
    if (defaultWorkingDirectory !== "") { document.getElementById("checkDirBtn").classList.add("success"); }
}

function showPreferences(){
    let defaultWorkingDirectory = JSON.parse(servletRequest("../dbvisservlet?function=getDefaultWorkingDirectory")).defaultWorkingDirectory.replaceAll("\\\\", "\\");
    if (defaultWorkingDirectory !== "null" && defaultWorkingDirectory !== null){
        document.getElementById("defaultWorkingDirectory").value = defaultWorkingDirectory;
        document.getElementById("checkDirBtn").classList.add("success");
    }
}

function savePreferencesChanges(){
    const defaultWorkingDir = document.getElementById("defaultWorkingDirectory").value;
    servletRequestPost("../dbvisservlet?function=setDefaultWorkingDirectory", defaultWorkingDir);
    displayQueryInfoBox(infoBoxProperties.success, "Success", "Preferences saved");
}

function removeClassesFromDefaultDirBtn() {
    let btn = document.getElementById("checkDirBtn");
    btn.classList.remove("alert");
    btn.classList.remove("success");
}

function setSidebarHeight(){
    let target = document.getElementById("sidebar-fixed");
    target.style.height=document.documentElement.scrollHeight+'px';
}

function displayQueryInfoBox(properties, header, message){
    Metro.notify.create(message, header, properties);
}
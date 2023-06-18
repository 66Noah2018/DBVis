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
    http.send(JSON.stringify(directory));
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
    http.send(JSON.stringify(directory));
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
    servletRequestPost(url, projectJson);
    window.location.href = "../index.html";
}

function editProjectProperties(){
    properties = JSON.parse(servletRequest("../dbvisservlet?function=getProjectProperties"));
    if (properties !== null){
        document.getElementById("checkDirBtn").classList.add("success"); 
        document.getElementById("selected-working-dir-edit").style.visibility = 'hidden';
        document.getElementById("title").value = properties.maintenance.title;
        document.getElementById("mlmname").value = properties.maintenance.mlmname;
        document.getElementById("arden").value = properties.maintenance.arden;
        document.getElementById("version").value = properties.maintenance.version;
        document.getElementById("institution").value = properties.maintenance.institution;
        document.getElementById("author").value = properties.maintenance.author;
        document.getElementById("specialist").value = properties.maintenance.specialist;
        document.getElementById("date").value = properties.maintenance.date;
        switch(properties.maintenance.validation){
            case "Production":
                document.getElementById("Production").checked = true;
                break;
            case "Research":
                document.getElementById("Research").checked = true;
                break;
            case "Testing":
                document.getElementById("Testing").checked = true;
                break;
            case "Expired":
                document.getElementById("Expired").checked = true;
                break;
            default:
                break;
        }
        const libFormCode = getLibraryFormCode([properties.library.purpose, properties.library.explanation, properties.library.keywords, properties.library.citations, properties.library.links]);
        let target = document.getElementById("edit-properties-section");
        target.innerHTML = "";
        target.appendChild(parser.parseFromString(libFormCode, 'text/html').body.firstChild);
        document.getElementById("workingDirectory").value = properties.workingDirectory;
        document.getElementById("selectedLocalFile").innerText = "Selected local mappings file: " + properties.localMappingFile;
        document.getElementById("selectedLocalFile").style.visibility = "visible";
        document.getElementById("selectedStandardizedFile").innerText = "Selected standardized mappings file: " + properties.standardizedMappingFile;
        document.getElementById("selectedStandardizedFile").style.visibility = "visible";
        let triggerTarget = document.getElementById("triggers-group");
        triggerTarget.innerHTML = "";
        let newRowsCode = '<table id="triggers-table-edit"><thead><tr><th>Trigger name</th><th>Trigger definition: event { ... }</th></tr></thead><tbody contenteditable>';
        for (const trigger in properties.triggers) {
            newRowsCode += "<tr><td>" + trigger + "</td><td>" + properties.triggers[trigger] + "</td></tr>";
        }
        newRowsCode += "</body></table>";
        triggerTarget.appendChild(parser.parseFromString(newRowsCode, 'text/html').body.firstChild);
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
    http.send(JSON.stringify(projectName));
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
    http.send(JSON.stringify(body));
    http.onload = function(){ response = http.responseText; };
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
    console.log("gonna load prev opened")
    let prevOpened = JSON.parse(servletRequest("../dbvisservlet?function=getPrevOpened"));
    console.log(prevOpened);
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
    document.getElementById("checkDirBtn").classList.add("success");
}

function showPreferences(){
    console.log(servletRequest("../dbvisservlet?function=getDefaultWorkingDirectory"))
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
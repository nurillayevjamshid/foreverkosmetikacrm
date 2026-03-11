var fso = new ActiveXObject("Scripting.FileSystemObject");
var f = fso.OpenTextFile("app.js", 1);
var code = f.ReadAll();
f.Close();
try {
    new Function(code);
    WScript.Echo("OK");
} catch (e) {
    WScript.Echo("ERROR: " + e.message);
    WScript.Echo("Line: " + e.lineNumber);
}

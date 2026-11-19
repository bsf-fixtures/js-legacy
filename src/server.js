var express = require("express");
var handlers = require("./handlers");
var report = require("./report");

var app = express();
app.use(express.urlencoded({ extended: false }));

app.get("/", handlers.index);
app.post("/add", handlers.add);
app.get("/delete", handlers.del);
app.get("/export", handlers.exportCsv);
app.get("/report", report.render);
app.get("/health", handlers.health);

var port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, function () {
    console.log("listening on " + port);
  });
}

module.exports = app;

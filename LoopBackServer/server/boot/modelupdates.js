module.exports = function(server) {
    var ds = server.dataSources.testMongoDB;
    ds.autoupdate(null, function () {
    });
};

/**
 * Created by jlueders on 4/13/15.
 */
angular.module('NodeWebBase')
    .controller('runTabController', ['$scope', '$rootScope', '$http','setSelectionMsg', function ($scope, $rootScope, $http, setSelectionMsg) {

        $scope.jobs = [];
        $scope.geqeModels = [];
        $scope.dataSetSelected = null;
        $scope.polygonSetSelected=null;
        $scope.geqeModel = null;

        $scope.modelSelected = function (item) {
            console.log("Selected Model", item)
            $scope.geqeModel = item;
        };


        setSelectionMsg.listen(function (evt, type, val) {
            if (type == "polygonSetSelected")
                $scope.polygonSetSelected = val;
            if (type == "dataSetSelected")
                $scope.dataSetSelected = val;
        });


        $scope.run = {
            sTopN: "300",
            sFileName: "",
            bPercent: "",
            cStopW: "",
            useTimeSeries: false,
            sTopPercent: "0.0001",
            nFeat: ""
        };

        $scope.training = {
            fileName: ""
        };


        /**
         * Save the site list (polygon)
         */
        $scope.saveList = function () {

            $rootScope.$emit("getShapesText",
                {
                    "scope": this,
                    "callback": function (resultsText) {
                        if (!$rootScope.isAppConfigured())
                            return;
                        var pName = $scope.polyFile;
                        var siteList = JSON.parse(resultsText);
                        siteList.name = pName;
                        siteList.username = $rootScope.username;
                        var modelId = $scope.getPolygonId();
                        if (modelId) siteList.id = modelId;

                        $http({
                            method: "POST",
                            url: "app/sitelists/save",
                            params: {
                                siteList: siteList
                            }
                        }).success(function (response) {
                            $("#resultsText").text(pName + " written");
                            $scope.populatePolygonSelect(); // refresh the polygon list to get the new id
                        }).error($rootScope.showError)
                    }
                });
        };

        $rootScope.$on('sampleShape', function (event, item) {
            if (!item)
                return;
            $http({
                method: "POST",
                url: "app/posts/sitelist",
                headers: {
                    "Content-Type": "application/json"
                },
                data: {
                    "sites": [item],
                    "from": 0,
                    "size": 100
                }
            }).success(function (response) {
                $rootScope.$emit("clearMarkers", ['training']);
                $rootScope.$emit("drawMapMarkers", response.hits, "training");
            }).error($rootScope.showError);
        });

        $scope.applyScores = function () {
            console.log("applyScores", $scope.polygonSetSelected, $scope.dataSetSelected);
            if (!$rootScope.isAppConfigured())
                return;

            // verify inputs

            if (!$scope.dataSetSelected || $scope.dataSetSelected === "--Select--") {
                $rootScope.showErrorMessage("Query Job", "Please select a data set.");
                return;
            }
            if ($scope.polygonSetSelected && $scope.polygonSetSelected.name != "--Select--" && $scope.geqeModel) {
                $rootScope.showErrorMessage("Query Job", "Select a Polygon OR a model, but not both.");
                return;
            }

            if (!$scope.run.sFileName) {
                $rootScope.showErrorMessage("Query Job", "Please select query jobname.");
                return;
            }


            var customStopWords = [];
            if ($scope.run.cStopW && $scope.run.cStopW != "") customStopWords = $scope.run.cStopW.split(",");
            var jobObj = {
                'name': $scope.run.sFileName,
                'username': $rootScope.username,
                'queryType': (!$scope.run.useTimeSeries || $scope.run.useTimeSeries == 0) ? 'location' : 'event',
                'limit': ($scope.run.bPercent) ? $scope.run.sTopPercent : $scope.run.sTopN,
                'customStopWords': customStopWords,
                'datasetId': $scope.dataSetSelected.name
            };

            // set the model or polygon
            if ($scope.geqeModel) {
                jobObj['geqeModelId'] = $scope.geqeModel.id
            }
            else {
                var siteListId = $scope.polygonSetSelected.id;
                if (!siteListId) {
                    $rootScope.showErrorMessage("Query Job", "Save your polygon file prior to running query.");
                    return;
                }
                jobObj['siteListId'] = siteListId;
            }


            $http({
                method: "POST",
                url: "app/jobs",
                params: jobObj
            }).success(function (response) {
                $rootScope.$emit("refreshJobsList");
            }).error($rootScope.showError)
        };


        $scope.modReturn = function () {
            var bChecked = $("#bPercent").is(":checked");
            var f1 = $("#rankReturnInput");
            var f2 = $("#percentReturnInput");
            if (bChecked == true) {
                f1.addClass("invis");
                f2.removeClass("invis");
            } else {
                f1.removeClass("invis");
                f2.addClass("invis");
            }
        };


        //go ahead and get the data sets from the server
        //INIT
        var watchRemoval = $scope.$watch($rootScope.isAppConfigured, function (newVal, oldVal) {
            if (newVal) {  // Don't do anything if Undefined.
                watchRemoval();
            }
        })
    }]);

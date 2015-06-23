angular.module('NodeWebBase')
    .filter('dateParse', function($filter) {
        return function(input,format,timezone) {
            return (!!input) ? $filter('date')( Date.parse(input), format, timezone) : '';
        };
    })
    .controller('detailsController', ['$scope','$rootScope','$window','$http','$timeout','ngDialog','applyFilterMsg','itemDetailsLoadedMsg',
        function ($scope, $rootScope,$window,$http, $timeout, ngDialog,applyFilterMsg,itemDetailsLoadedMsg) {
        $scope.scopeName = 'detailsController';
        $scope.data = {"nTotal":0};
        $scope.posts = null;
        $scope.currentItemIndex = null;
        $scope.displayIndex = 0;
        $scope.displayCaptionHtml = "None";
        $scope.termArray = [];
        $scope.filterText = "";
        $scope.defaultItem = {  "img":"/images/blank.png",
                                "usr":"None Selected",
                                "cap":"",
                                "sco":"",
                                "nTotal":0,
                                "date":""};
        $scope.socialMediaUrl = $scope.defaultItem.img;
        $scope.currentItem = $scope.defaultItem;

        applyFilterMsg.listen(function(event,filter){
            if(!$scope.data.posts)
                return;

            $scope.posts.length = 0;
            angular.forEach($scope.data.posts,function(post){
                if(filter != '') {
                    var cap = post.cap.toLowerCase();
                    if (cap.indexOf(filter.toLowerCase()) < 0) {
                        return;
                    }
                }
                $scope.posts.push(post);
            });

            $timeout(function() {
                if ($scope.posts.length == 0) {
                    $scope.currentItemIndex = null;
                    $scope.displayIndex = 0;
                    $scope.displayCaptionHtml = "None";
                    $scope.termArray = [];
                    $scope.currentItem = $scope.defaultItem;
                    $("#caption").html("None");
                    return;
                }

                $scope.currentItemIndex = 0;
                $scope.displayIndex = 1;
                $scope.currentItem = $scope.posts ? $scope.posts[0] : $scope.data;
                $scope.displayCaptionHtml = $scope.highlightText($scope.currentItem.cap);
                $("#caption").html($scope.displayCaptionHtml);
                $scope.getAccount();
            });

        });

        $rootScope.$on('loadItemData', function (event, data) {
            $timeout(function(){
                $scope.data = data;
                if(data.posts) {
                    $scope.posts = data.posts.slice(0);
                }
                $scope.currentItemIndex = 0;
                $scope.displayIndex = 1;
                $scope.currentItem = $scope.data.posts?$scope.data.posts[0]:$scope.data;
                $scope.displayCaptionHtml = $scope.highlightText($scope.currentItem.cap);
                $("#caption").html($scope.displayCaptionHtml);
                $scope.getAccount();
            });

        });

        $rootScope.$on("setTermDictionary", function(event,data){
            angular.forEach(data,function(entry,idx){
                $scope.termArray.push(entry[0]);
            })
        });

        $rootScope.$on('clearResults', function (event) {
            $scope.clearAll();
        });
        $rootScope.$on('clearAll', function () {
            $scope.clearAll();
        });

        $scope.clearAll = function(){
            $scope.data = {"nTotal":0};
            $scope.currentItemIndex = null;
            $scope.displayIndex = 0;
            $scope.displayCaptionHtml = "None";
            $scope.termArray = [];
            $scope.currentItem = $scope.defaultItem;
            $("#caption").html("None");
        };

        $scope.filterChanged=function(){
            applyFilterMsg.broadcast($scope.filterText)
        };

        $scope.findSocialMediaLink = function(username, socialMediaType, callback){
            $http({
                method:"GET",
                url:  "app/socialMediaQuery/" + username,
                params : {
                    socialMediaType: socialMediaType
                }}).success(function (response) {
                    callback(response);
                })
        };

        $scope.loadSocialPage = function(url){
                if(url.responseText === ""){
                    $scope.socialMediaUrl = $scope.currentItem.img;
                    return;
                }

                $scope.socialMediaUrl = url.responseText;
        };

        $scope.getAccount = function(){
            if($scope.currentItem == $scope.defaultItem)
                return;

            if(!$scope.currentItem['socialMediaType'])
            {
                if($scope.currentItem.img && $scope.currentItem.img != "None"){
                    $scope.currentItem['socialMediaType'] = 'instagram';
                }
                else{
                    $scope.currentItem.img = "/images/blank.png";
                    $scope.currentItem['socialMediaType'] = 'twitter';
                }

            }

            if($scope.currentItem['socialMediaType'] === 'instagram'){
                $scope.socialMediaUrl = "https://instagram.com/" + $scope.currentItem.usr;
                return;
            }

            $scope.socialMediaUrl = "https://twitter.com/" + $scope.currentItem.usr;

            $scope.findSocialMediaLink($scope.currentItem.usr,"twitter", function(data){
                if($scope.currentItem == $scope.defaultItem)
                    return;

                if(data && $scope.currentItem) {
                        $scope.currentItem.img = data.profile_image_url.replace('_normal','');

                }
            });
        };

        $scope.showImage = function(url){
            ngDialog.openConfirm({
                template: '/views/app/imageView',
                controller: ['$scope', function ($scope) {
                    $scope.url = url;
                    $scope.close = function () {
                        $scope.closeThisDialog(null);
                    }
                }]
            });
        };

        $scope.replaceURLWithHTMLLinks = function(text) {
            var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return text.replace(exp,"<a href='$1' target='_blank'>$1</a>");
        };

        $scope.highlightText = function(text){
            var words = text.split(" "),
                termList=$scope.termArray.join("|"),
                alpha={};

                angular.forEach(words,function(word,idx){

                    if(alpha = word.replace(/[^a-zA-Z0-9]/,"").match(new RegExp(termList,"i"))){
                        // alpha = ["runners", index: 0, input: "runners"]
                        // we get the matched word [0] and the searched word (['input'])
                        if(alpha[0].length == alpha['input'].length){
                            // Prevents matching keyword 'an' with 'another'
                            words[idx] = '<span class="highlight">' + word + "</span>";
                        }
                    }
                });

            var highlights = words.join(' ');
            return $scope.replaceURLWithHTMLLinks(highlights);
        };

        $scope.loadCurrentItemDetails = function(){
            $scope.displayIndex = $scope.currentItemIndex+1;
            $scope.currentItem = $scope.posts[$scope.currentItemIndex];
            $scope.displayCaptionHtml = $scope.highlightText($scope.currentItem.cap);
            $("#caption").html($scope.displayCaptionHtml);
            $scope.getAccount();

            itemDetailsLoadedMsg.broadcast($scope.currentItem);
        };

        $scope.next = function(){
            if(!$scope.data || !$scope.posts)
                return;
            $scope.currentItemIndex++;

            if($scope.currentItemIndex >= $scope.posts.length)
                $scope.currentItemIndex = 0;

            $scope.loadCurrentItemDetails();
        };

        $scope.previous = function(){
            if(!$scope.data || !$scope.posts)
                return;
            $scope.currentItemIndex--;

            if($scope.currentItemIndex < 0)
                $scope.currentItemIndex = $scope.posts.length-1;

            $scope.loadCurrentItemDetails();
        };

        $scope.getUser = function(){
            $http({
                url:  "app/twitter/user",
                params : {
                    "screen_name":"twitterapi"
                }}).success(function (response){
                    $scope.user = response;
                }).error($rootScope.showError)
        };
    }]);
angular.module('NodeWebBase')
    .controller('detailsController', ['$scope','$rootScope','$window','$http','ngDialog', function ($scope, $rootScope,$window,$http, ngDialog) {
        $scope.scopeName = 'detailsController';
        $scope.data = {"nTotal":0};
        $scope.currentItemIndex = null;
        $scope.displayIndex = 0;
        $scope.displayCaptionHtml = "None";
        $scope.termArray = [];
        $scope.defaultItem = {  "img":"/images/blank.png",
                                "usr":"None Selected",
                                "cap":"",
                                "sco":"",
                                "nTotal":0,
                                "date":""};
        $scope.socialMediaUrl = $scope.defaultItem.img;
        $scope.currentItem = $scope.defaultItem;

        $rootScope.$on('loadItemData', function (event, data) {
            $scope.data = data;
            $scope.currentItemIndex = 0;
            $scope.displayIndex = 1;
            $scope.currentItem = $scope.data.posts[0];
            $scope.displayCaptionHtml = $scope.highlightText($scope.currentItem.cap);
            $("#caption").html($scope.displayCaptionHtml);
            $scope.getAccount();
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
                if(data) {
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
            var words = text.split(' ');
            angular.forEach($scope.termArray,function(term,idx){
                angular.forEach(words,function(word,idx){
                    if(word.toLowerCase() == term.toLowerCase()){
                        words[idx] = '<span class="highlight">' + word + "</span>";
                    }
                    else{
                    }
                });
            });
            var highlights = words.join(' ');
            return $scope.replaceURLWithHTMLLinks(highlights);

        };

        $scope.next = function(){
            if(!$scope.data || !$scope.data.posts)
                return;
            $scope.currentItemIndex++;

            if($scope.currentItemIndex >= $scope.data.posts.length)
                $scope.currentItemIndex = 0;

            $scope.displayIndex = $scope.currentItemIndex+1;
            $scope.currentItem = $scope.data.posts[$scope.currentItemIndex];
            $scope.displayCaptionHtml = $scope.highlightText($scope.currentItem.cap);
            $("#caption").html($scope.displayCaptionHtml);
            $scope.getAccount();
        };

        $scope.previous = function(){
            if(!$scope.data || !$scope.data.posts)
                return;
            $scope.currentItemIndex--;

            if($scope.currentItemIndex < 0)
                $scope.currentItemIndex = $scope.data.posts.length-1;

            $scope.displayIndex = $scope.currentItemIndex+1;
            $scope.currentItem = $scope.data.posts[$scope.currentItemIndex];
            $scope.displayCaptionHtml = $scope.highlightText($scope.currentItem.cap);
            $("#caption").html($scope.displayCaptionHtml);
            $scope.getAccount();
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
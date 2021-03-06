App.config(function($stateProvider) {

    $stateProvider.state('loyaltycard-view', {
        url: BASE_PATH+"/loyaltycard/mobile_view/index/value_id/:value_id",
        controller: 'LoyaltyViewController',
        templateUrl: "templates/loyaltycard/l1/view.html"
    });

}).controller('LoyaltyViewController', function($ionicModal, $rootScope, $scope, $state, $stateParams, $timeout, $translate, $window, httpCache, Customer, Dialog, Loyalty, Url, AUTH_EVENTS, CACHE_EVENTS) {

    $scope.$on("connectionStateChange", function(event, args) {
        if(args.isOnline == true) {
            $scope.loadContent();
        }
    });

    Customer.onStatusChange("loyalty", [
        Url.get("loyaltycard/mobile_view/findall", {value_id: $stateParams.value_id})
    ]);

    $scope.$on(AUTH_EVENTS.loginSuccess, function() {
        $scope.is_logged_in = true;
        $scope.loadContent();
    });
    $scope.$on(AUTH_EVENTS.logoutSuccess, function() {
        $scope.is_logged_in = false;
        $scope.loadContent();
    });
    $scope.$on("$ionicView.beforeEnter", function() {
        $scope.loadContent();
    });

    $scope.is_logged_in = Customer.isLoggedIn();
    $scope.is_loading = false;
    $scope.value_id = Loyalty.value_id = $stateParams.value_id;

    $scope.pad = {
        password: "",
        points: new Array(),
        number_of_points: 0,
        add: function(nbr) {

            if(this.password.length < 4) {

                this.password += nbr;
                if(this.password.length == 4) {
                    $scope.validate();
                }

            }
            return this;
        },
        remove: function() {
            this.password = this.password.substr(0, this.password.length - 1);
            return this;
        }
    };

    $scope.loadContent = function() {

        $scope.is_loading = true;

        Loyalty.findAll().success(function(data) {

            $scope.promotions = data.promotions;
            $scope.card = data.card;
            $scope.pictos = data.picto_urls;
            $scope.card_is_locked = data.card_is_locked;
            $scope.points = data.points;
            $scope.page_title = data.page_title;
            $scope.tc_id = data.tc_id;

        }).finally(function() {
            $scope.is_loading = false;
        });
    };

    $scope.openPad = function(card) {

        if($rootScope.isOverview) {
            $rootScope.showMobileFeatureOnlyError();
            return;
        }

        if(!Customer.isLoggedIn()) {
            $scope.login();
            return;
        }

        $scope.pad.modal = {};
        $scope.pad.password = "";
        $scope.pad.points = new Array();
        $scope.pad.buttons = new Array();
        for(var i = 0; i < 10; i++) $scope.pad.buttons.push(i);
        $scope.pad.card = card;
        $scope.pad.number_of_points = 1;
        $scope.page_title = $scope.pad_title;

        var remaining = card.max_number_of_points - card.number_of_points;
        var points = new Array();
        for(var i = 0; i <= remaining-1; i++) {
            points[i] = i+1;
        }

        $scope.pad.points = points;

        $ionicModal.fromTemplateUrl('templates/loyaltycard/l1/pad.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.pad.modal = modal;
            $scope.pad.modal.show();
        });

    };
    $scope.closePad = function() {
        console.log("$scope.card: ", $scope.card);
        console.log("$scope.pad.card: ", $scope.pad.card);
        $scope.pad.modal.hide();
    };

    $scope.$on('$destroy', function() {
        if($scope.pad.modal) {
            $scope.pad.modal.remove();
        }
    });

    $scope.validate = function() {

        Loyalty.validate($scope.pad).success(function(data) {

            if(data) {

                if(data.message) {
                    Dialog.alert("", data.message, $translate.instant("OK"));
                }

                if(data.close_pad) {
                    $scope.closePad();
                } else {
                    $scope.pad.password = "";
                }

                if(data.number_of_points) {

                    httpCache.remove(Url.get("loyaltycard/mobile_view/findall", {value_id: $stateParams.value_id}));

                    $scope.card.number_of_points = data.number_of_points;

                    if($scope.card.max_number_of_points == $scope.card.number_of_points) {
                        $scope.loadContent();
                    }

                } else if(data.promotion_id_to_remove) {
                    for(var i in $scope.promotions) {
                        if($scope.promotions[i].id == data.promotion_id_to_remove) {
                            $scope.promotions.splice(i, 1);
                        }
                    }
                } else {
                    $scope.loadContent();
                }

                if(data.customer_card_id) {
                    $scope.card.id = data.customer_card_id;
                }

            }

            $rootScope.$broadcast(CACHE_EVENTS.clearSocialGaming);

        }).error(function(data) {

            if(data && data.message) {
                Dialog.alert($translate.instant("Error"), data.message, $translate.instant("OK"));

                if(data.close_pad) {
                    $scope.closePad();
                    if(data.card_is_locked) {
                        $scope.card_is_locked = true;
                    }
                } else {
                    $scope.pad.password = "";
                }

            }

            if(data.customer_card_id) {
                $scope.card.id = data.customer_card_id;
            }

        });
    };

    $scope.login = function() {

        if($rootScope.isOverview) {
            $rootScope.showMobileFeatureOnlyError();
            return;
        }

        $ionicModal.fromTemplateUrl('templates/customer/account/l1/login.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            Customer.modal = modal;
            Customer.modal.show();
        });

    };

    if($scope.isOverview) {

        $window.prepareDummy = function() {
            $timeout(function() {
                $scope.card = {id: -1, is_visible: true};
                $scope.points = new Array();
            });
        };

        $window.setAttributeToDummy = function(attribute, value) {
            $timeout(function() {
                console.log(attribute);
                console.log($scope.card[attribute]);
                $scope.card[attribute] = value;
                console.log($scope.card);
            });
        };

        $window.setNumberOfPoints = function(nbr) {

            $timeout(function() {
                var points = new Array();
                for(var i = 0; i < nbr; i++) {
                    points.push({
                        is_validated: false,
                        image_url: $scope.pictos.normal_url
                    });
                }
                $scope.card.max_number_of_points = nbr;
                $scope.points = points;
            });

        };

        $scope.$on("$destroy", function() {
            $window.prepareDummy = null;
            $window.setAttributeToDummy = null;
            $window.setNumberOfPoints = null;
        });
    }

    $scope.showTc = function() {
        $state.go("tc-view", {tc_id: $scope.tc_id});
    };

});
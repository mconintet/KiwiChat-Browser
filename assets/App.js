(function (W, $) {
    "use strict";

    if (!W['WebSocket']) {
        alert('Missing WebSocket APIs!');
    }

    toastr.options = {
        "closeButton": false,
        "debug": false,
        "newestOnTop": false,
        "progressBar": true,
        "positionClass": "toast-top-center",
        "preventDuplicates": true,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

    $.fn.extend({
        disable: function (btnVal) {
            return this.each(function () {
                if (btnVal) {
                    $(this).val(btnVal);
                }
                this.disabled = true;
            });
        },
        enable: function (btnVal) {
            return this.each(function () {
                if (btnVal) {
                    $(this).val(btnVal);
                }
                this.disabled = false;
            });
        }
    });

    var getValueByPath = function (obj, path, sep) {
        sep = sep || '/';

        var reg = new RegExp('^' + sep + '|' + sep + '$');
        var regSplit = new RegExp(sep);

        path = path.replace(reg, '').split(regSplit);
        var i = 0, len = path.length, retVal = obj, key;

        for (; i < len; i++) {
            key = path[i];

            if (retVal) {
                retVal = retVal[key];
            } else {
                retVal = null;
                break;
            }
        }

        return retVal === undefined ? null : retVal;
    };

    var setValueByPath = function (obj, path, value, sep, autoFill) {
        sep = sep || '/';

        var reg = new RegExp('^' + sep + '|' + sep + '$');
        var regSplit = new RegExp(sep);

        autoFill = typeof autoFill === 'undefined' ? true : !!autoFill;

        path = path.replace(reg, '').split(regSplit);
        var i = 0, len = path.length, key, tmpObj = obj;

        for (; i < len; ++i) {
            key = path[i];

            if (i != len - 1) {

                if (typeof tmpObj[key] !== 'object' && autoFill) {
                    tmpObj[key] = {};
                } else if (typeof tmpObj[key] !== 'object' && !autoFill) {
                    return false;
                }

                tmpObj = tmpObj[key];
            } else {
                tmpObj[key] = value;
            }
        }

        return true;
    };

    var chatPanel = $('#chatPanel');
    var chatPanelBody = chatPanel.find('> .panel-body');

    var srvAddrInput = $('#srvAddrInput');
    var btnConnect = $('#btnConnect');
    var btnDisconnect = $('#btnDisconnect');

    var msgInput = $('#msgInput');
    var btnSendMsg = $('#btnSendMsg');

    var btnLogin = $('#btnLogin');
    var btnLogout = $('#btnLogout');

    var loginEmail = $('#loginEmail');
    var loginPassword = $('#loginPassword');

    var regEmail = $('#regEmail');
    var regPassword = $('#regPassword');
    var btnSubmitRegister = $('#btnSubmitRegister');

    var btnGoToLogin = $('#btnGoToLogin');
    var btnGoToRegister = $('#btnGoToRegister');

    var welcomeModal = $('#welcomeModal');
    var loginModal = $('#loginModal');
    var registerModal = $('#registerModal');

    var chkPressEnterSend = $('#chkPressEnterSend');

    var btnSendBuddyId = $('#btnSendBuddyId');
    var buddyIdInput = $('#buddyIdInput');

    var yourID = $('#yourID');

    var webSocketConn = null;

    var currentUid = -1;
    var currentToken = '';
    var currentBuddyId = -1;

    var clearCurrentStatus = function () {
        webSocketConn = null;
        currentUid = -1;
        currentToken = '';
        currentBuddyId = -1;
    };

    var isLoggedIn = function () {
        return webSocketConn != null && currentUid != 0 && currentToken != '';
    };

    btnSendBuddyId.on('click', function () {
        var buddyId = buddyIdInput.val().trim().replace(/#/g, '');
        if (!buddyId) {
            toastr.error('Please input your buddy\'s id');
            return;
        }
        currentBuddyId = parseInt(buddyId);
        if (isNaN(currentBuddyId) || !isFinite(currentBuddyId)) {
            toastr.error('Please input a valid ID number');
            currentBuddyId = -1;
        }
    });

    var appendMsg = function (html) {
        chatPanel.stop();
        chatPanelBody.append(html);
        chatPanel.animate({scrollTop: chatPanel.get(0).scrollHeight}, 1000);
    };

    var msgRouter = {
        handlers: {},
        add: function (pattern, handler) {
            this.handlers[pattern] = handler;
        },
        route: function (pattern, msg) {
            var handler = this.handlers[pattern];
            if (handler) {
                handler(msg);
            }
        }
    };

    var setupWebSocketConn = function (srvAddr) {
        try {
            webSocketConn = new WebSocket(srvAddr);

            $(webSocketConn).on('error', function () {
                toastr.error('Some errors occur, please view console output');
                btnConnect.enable('Connect');
            });

            $(webSocketConn).on('open', function () {
                toastr.success('Connection opened.');
                btnConnect.disable('Connect');
                btnDisconnect.enable();
            });

            $(webSocketConn).on('close', function () {
                clearCurrentStatus();
                toastr.success('Connection closed.');
                btnDisconnect.disable();
                btnConnect.enable('Connect');
                loginModal.modal();
            });

            $(webSocketConn).on('message', function (evt) {
                var msg = JSON.parse(evt.originalEvent.data);
                if (msg && msg['action']) {
                    msgRouter.route(msg['action'], msg);
                }
            });
        } catch (err) {
            clearCurrentStatus();
            toastr.error(err.toString());
            btnDisconnect.disable();
            btnConnect.enable('Connect');
            loginModal.modal();
        }
    };

    btnConnect.on('click', function () {
        var srvAddr = srvAddrInput.val().trim();
        if (!srvAddr) {
            toastr.error('Please input service URI.');
            return;
        }

        btnConnect.disable('Connecting...');
        setupWebSocketConn(srvAddr)
    });

    btnDisconnect.on('click', function () {
        if (webSocketConn) webSocketConn.close();
    });

    btnLogin.on('click', function () {
        if (!webSocketConn) {
            toastr.error('Please connect first.');
            return;
        }

        var email = loginEmail.val().trim();
        if (!email) {
            toastr.error('Please input email.');
            return;
        }

        var password = loginPassword.val().trim();
        if (!password) {
            toastr.error('Please input password.');
            return;
        }

        var msg = {};
        setValueByPath(msg, "action", "login");
        setValueByPath(msg, "email", email);
        setValueByPath(msg, "network", 1);
        setValueByPath(msg, "password", password);

        webSocketConn.send(JSON.stringify(msg));
    });

    var sendMsg = function () {
        var msgText = msgInput.val().trim();
        if (!msgText) return;

        var html = Template.get('msgMe').render({msg: msgText});
        appendMsg(html);

        var msg = {};
        setValueByPath(msg, 'action', 'send-message');
        setValueByPath(msg, 'token', currentToken);
        setValueByPath(msg, 'from', currentUid);
        setValueByPath(msg, 'to', currentBuddyId);
        setValueByPath(msg, 'msgID', 0);
        setValueByPath(msg, 'msgType', 0);
        setValueByPath(msg, 'msgContent', msgText);

        webSocketConn.send(JSON.stringify(msg));
        msgInput.val('');
    };

    var pressEnterToSendMsg = function (e) {
        if (e.keyCode == 13) {
            msgInput.val(msgInput.val().trim());
            sendMsg();
        }
    };

    chkPressEnterSend.on('click', function () {
        if ($(this).is(':checked')) {
            msgInput.on('keyup', pressEnterToSendMsg);
        } else {
            msgInput.off('keyup', pressEnterToSendMsg);
        }
    });

    btnSendMsg.on('click', function () {
        if (!isLoggedIn()) {
            toastr.error('Please login at first.');
            return;
        }
        sendMsg();
    });

    btnSubmitRegister.on('click', function () {
        if (!webSocketConn) {
            toastr.error('Please connect at first');
            return;
        }

        var email = regEmail.val().trim();
        if (!email) {
            toastr.error('Please input email.');
            return;
        }

        var password = regPassword.val().trim();
        if (!password) {
            toastr.error('Please input password.');
            return;
        }

        var msg = {};
        setValueByPath(msg, 'action', 'register');
        setValueByPath(msg, 'email', email);
        setValueByPath(msg, 'password', password);

        webSocketConn.send(JSON.stringify(msg));
    });

    var handleRegister = function (msg) {
        if (msg['errCode'] !== 0) {
            toastr.error(msg['errMsg']);
            return;
        }
        registerModal.modal('hide');
        currentUid = msg['uid'];
        currentToken = msg['token'];
        toastr.success('Registered successfully, current uid: ' + currentUid);
    };
    msgRouter.add('register-return', handleRegister);


    var handleNewMessage = function (msg) {
        if (msg['errCode'] !== 0) {
            toastr.error(msg['errMsg']);
            return;
        }
        currentBuddyId = msg['from'];
        var html = Template.get('msgOther').render({msg: msg['msgContent']});
        appendMsg(html);
    };
    msgRouter.add('new-message', handleNewMessage);

    var handleLogin = function (msg) {
        if (msg['errCode'] !== 0) {
            toastr.error(msg['errMsg']);
            return;
        }
        loginModal.modal('hide');
        currentUid = msg['uid'];
        currentToken = msg['token'];
        toastr.success('Logged in successfully, current uid: ' + currentUid);
        yourID.html(currentUid);
    };
    msgRouter.add('login-return', handleLogin);

    var handleSendMessage = function (msg) {
        if (msg['errCode'] == 1001)
            toastr.warning('Your buddy is offline now');
    };
    msgRouter.add('send-message-return', handleSendMessage);

    btnGoToLogin.on('click', function () {
        welcomeModal.modal('hide');
        loginModal.modal();
    });

    loginModal.on('hidden.bs.modal', function () {
        if (!isLoggedIn()) {
            welcomeModal.modal();
        }
    });

    btnGoToRegister.on('click', function () {
        welcomeModal.modal('hide');
        registerModal.modal();
    });

    registerModal.on('hidden.bs.modal', function () {
        if (!isLoggedIn()) {
            welcomeModal.modal();
        }
    });

    $(function () {
        if (!isLoggedIn()) {
            welcomeModal.modal();
        }

        chkPressEnterSend.trigger('click');
    });
})(window, jQuery);
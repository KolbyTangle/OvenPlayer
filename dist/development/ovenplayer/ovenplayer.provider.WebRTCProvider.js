/*! OvenPlayerv0.7.4 | (c)2018 AirenSoft Co., Ltd. | MIT license (https://github.com/AirenSoft/OvenPlayerPrivate/blob/master/LICENSE) | Github : https://github.com/AirenSoft/OvenPlayer */
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["ovenplayer.provider.WebRTCProvider"],{

/***/ "./src/js/api/provider/html5/WebRTC.js":
/*!*********************************************!*\
  !*** ./src/js/api/provider/html5/WebRTC.js ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Manager = __webpack_require__(/*! api/media/Manager */ "./src/js/api/media/Manager.js");

var _Manager2 = _interopRequireDefault(_Manager);

var _Provider = __webpack_require__(/*! api/provider/html5/Provider */ "./src/js/api/provider/html5/Provider.js");

var _Provider2 = _interopRequireDefault(_Provider);

var _WebRTCLoader = __webpack_require__(/*! api/provider/html5/WebRTCLoader */ "./src/js/api/provider/html5/WebRTCLoader.js");

var _WebRTCLoader2 = _interopRequireDefault(_WebRTCLoader);

var _promise = __webpack_require__(/*! api/shims/promise */ "./src/js/api/shims/promise.js");

var _promise2 = _interopRequireDefault(_promise);

var _validator = __webpack_require__(/*! utils/validator */ "./src/js/utils/validator.js");

var _constants = __webpack_require__(/*! api/constants */ "./src/js/api/constants.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @brief   webrtc provider extended core.
 * @param   element video element.
 * @param   playerConfig    config.
 * */

/**
 * Created by hoho on 2018. 6. 11..
 */
var WebRTC = function WebRTC(container, playerConfig) {

    var mediaManager = (0, _Manager2.default)(container, _constants.PROVIDER_WEBRTC);
    var element = mediaManager.create();

    var webrtcLoader = null;
    var that = {},
        super_destroy = "",
        listener = "";

    var errorHandler = function errorHandler(error) {
        that.setState(_constants.STATE_ERROR);
        that.pause();
        that.trigger(_constants.ERROR, error);
    };
    var onBeforeLoad = function onBeforeLoad(source) {
        if ((0, _validator.isWebRTC)(source.file, source.type)) {
            OvenPlayerConsole.log("WEBRTC : onBeforeLoad : ", source);
            if (webrtcLoader) {
                webrtcLoader.destroy();
                webrtcLoader = null;
            }
            webrtcLoader = (0, _WebRTCLoader2.default)(that, source.file, errorHandler);
            webrtcLoader.connect().then(function (stream) {
                element.srcObject = stream;
                element.play();
            });
        }
    };

    that = (0, _Provider2.default)(_constants.PROVIDER_WEBRTC, element, playerConfig, onBeforeLoad);
    OvenPlayerConsole.log("WEBRTC PROVIDER LOADED.");
    super_destroy = that.super('destroy');

    that.destroy = function () {
        if (webrtcLoader) {
            webrtcLoader.destroy();
            webrtcLoader = null;
        }
        mediaManager.destroy();

        super_destroy();
        OvenPlayerConsole.log("WEBRTC :  PROVIDER DESTROYED.");
    };
    return that;
};

exports.default = WebRTC;

/***/ }),

/***/ "./src/js/api/provider/html5/WebRTCLoader.js":
/*!***************************************************!*\
  !*** ./src/js/api/provider/html5/WebRTCLoader.js ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _adapter = __webpack_require__(/*! utils/adapter */ "./src/js/utils/adapter.js");

var _adapter2 = _interopRequireDefault(_adapter);

var _promise = __webpack_require__(/*! api/shims/promise */ "./src/js/api/shims/promise.js");

var _promise2 = _interopRequireDefault(_promise);

var _underscore = __webpack_require__(/*! utils/underscore */ "./src/js/utils/underscore.js");

var _underscore2 = _interopRequireDefault(_underscore);

var _constants = __webpack_require__(/*! api/constants */ "./src/js/api/constants.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var WebRTCLoader = function WebRTCLoader(provider, url, errorCallback) {
    var url = url;
    var ws = "";
    var peerConnection = "";
    var statisticsTimer = "";
    var config = {
        'iceServers': [{
            'urls': 'stun:stun.l.google.com:19302'
        }]
    };
    var that = {};
    var mySdp = "";

    (function () {
        var existingHandler = window.onbeforeunload;
        window.onbeforeunload = function (event) {
            if (existingHandler) {
                existingHandler(event);
            };
            OvenPlayerConsole.log("This calls auto when browser closed.");
            closePeer();
        };
    })();

    function initialize() {
        OvenPlayerConsole.log("WebRTCLoader connecting...");

        var onLocalDescription = function onLocalDescription(id, connection, desc) {
            connection.setLocalDescription(desc).then(function () {
                // my SDP created.
                var localSDP = connection.localDescription;
                OvenPlayerConsole.log('Local SDP', localSDP);
                mySdp = localSDP; //test code
                // my sdp send to server.
                ws.send(JSON.stringify({
                    id: id,
                    command: "answer",
                    sdp: localSDP
                }));
            }).catch(function (error) {
                closePeer({ code: _constants.PLAYER_WEBRTC_SET_LOCAL_DESC_ERROR, reason: "setLocalDescription error occurred", message: "setLocalDescription error occurred", error: error });
            });
        };

        return new _promise2.default(function (resolve, reject) {
            OvenPlayerConsole.log("WebRTCLoader url : " + url);
            try {
                ws = new WebSocket(url);
                ws.onopen = function () {
                    ws.send(JSON.stringify({ command: "request_offer" }));
                };
                ws.onmessage = function (e) {
                    var message = JSON.parse(e.data);
                    if (message.error) {
                        OvenPlayerConsole.log(message.error);
                        closePeer({ code: _constants.PLAYER_WEBRTC_WS_ERROR, reason: "websocket error occured", message: "websocket error occurred", error: message });

                        return false;
                    }
                    if (message.list) {
                        OvenPlayerConsole.log('List received');
                        return;
                    }

                    if (!message.id) {
                        OvenPlayerConsole.log('ID must be not null');
                        return;
                    }

                    if (!peerConnection) {
                        peerConnection = new RTCPeerConnection(config);

                        peerConnection.onicecandidate = function (e) {
                            if (e.candidate) {
                                OvenPlayerConsole.log("WebRTCLoader send candidate to server : " + e.candidate);
                                ws.send(JSON.stringify({
                                    id: message.id,
                                    command: "candidate",
                                    candidates: [e.candidate]
                                }));
                            }
                        };

                        peerConnection.onnegotiationneeded = function () {
                            peerConnection.createOffer().then(function (desc) {
                                OvenPlayerConsole.log("createOffer : success");
                                onLocalDescription(message.id, peerConnection, desc);
                            }).catch(function (err) {
                                closePeer({ code: _constants.PLAYER_WEBRTC_CREATE_ANSWER_ERROR, reason: "createOffer error occurred", message: "createOffer error occurred", error: error });
                            });
                        };

                        peerConnection.onaddstream = function (e) {
                            OvenPlayerConsole.log("stream received.");
                            // stream received.
                            var lostPacketsArr = [],
                                slotLength = 8,
                                //8 statistics. every 2 seconds
                            prevPacketsLost = 0,
                                avg8Losses = 0,
                                avgMoreThanThresholdCount = 0,
                                //If avg8Loss more than threshold.
                            threshold = 20;
                            var extractLossPacketsOnNetworkStatus = function extractLossPacketsOnNetworkStatus() {
                                statisticsTimer = setTimeout(function () {
                                    if (!peerConnection) {
                                        return false;
                                    }
                                    peerConnection.getStats().then(function (stats) {
                                        //console.log(stats);
                                        stats.forEach(function (state) {
                                            //console.log(state);
                                            if (state.type === "inbound-rtp" && !state.isRemote) {
                                                OvenPlayerConsole.log(state);

                                                //(state.packetsLost - prevPacketsLost) is real current lost.
                                                lostPacketsArr.push(parseInt(state.packetsLost) - parseInt(prevPacketsLost));

                                                if (lostPacketsArr.length > slotLength) {
                                                    lostPacketsArr = lostPacketsArr.slice(lostPacketsArr.length - slotLength, lostPacketsArr.length);
                                                    avg8Losses = _underscore2.default.reduce(lostPacketsArr, function (memo, num) {
                                                        return memo + num;
                                                    }, 0) / slotLength;
                                                    OvenPlayerConsole.log("Last8 LOST PACKET AVG  : " + avg8Losses, state.packetsLost, lostPacketsArr);
                                                    if (avg8Losses > threshold) {
                                                        avgMoreThanThresholdCount++;
                                                        if (avgMoreThanThresholdCount === 3) {
                                                            OvenPlayerConsole.log("NETWORK UNSTABLED!!! ");
                                                            clearTimeout(statisticsTimer);
                                                            provider.trigger(_constants.NETWORK_UNSTABLED);
                                                        }
                                                    } else {
                                                        avgMoreThanThresholdCount = 0;
                                                    }
                                                }

                                                prevPacketsLost = state.packetsLost;
                                            }
                                        });

                                        extractLossPacketsOnNetworkStatus();
                                    });
                                }, 2000);
                            };
                            extractLossPacketsOnNetworkStatus();
                            resolve(e.stream);
                        };
                    }

                    if (message.sdp) {
                        //Set remote description when I received sdp from server.
                        peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp)).then(function () {
                            if (peerConnection.remoteDescription.type === 'offer') {
                                // This creates answer when I received offer from publisher.
                                peerConnection.createAnswer().then(function (desc) {
                                    OvenPlayerConsole.log("createAnswer : success");
                                    onLocalDescription(message.id, peerConnection, desc);
                                }).catch(function (error) {
                                    closePeer({ code: _constants.PLAYER_WEBRTC_CREATE_ANSWER_ERROR, reason: "createAnswer error occurred", message: "createAnswer error occurred", error: error });
                                });
                            }
                        }).catch(function (error) {
                            closePeer({ code: _constants.PLAYER_WEBRTC_SET_REMOTE_DESC_ERROR, reason: "setRemoteDescription error occurred", message: "setRemoteDescription error occurred", error: error });
                        });
                    }

                    if (message.candidates) {
                        // This receives ICE Candidate from server.
                        for (var i = 0; i < message.candidates.length; i++) {
                            if (message.candidates[i] && message.candidates[i].candidate) {

                                peerConnection.addIceCandidate(new RTCIceCandidate(message.candidates[i])).then(function () {
                                    OvenPlayerConsole.log("addIceCandidate : success");
                                }).catch(function (error) {
                                    closePeer({ code: _constants.PLAYER_WEBRTC_ADD_ICECANDIDATE_ERROR, reason: "addIceCandidate error occurred", message: "addIceCandidate error occurred", error: error });
                                });
                            }
                        }
                    }
                };
                ws.onerror = function (e) {
                    closePeer({ code: _constants.PLAYER_WEBRTC_WS_ERROR, reason: "websocket error occured", message: "websocket error occurred", error: e });
                    reject(e);
                };
            } catch (error) {
                closePeer({ code: _constants.PLAYER_WEBRTC_WS_ERROR, reason: "websocket error occured", message: "websocket error occurred", error: error });
            }
        });
    }

    function closePeer(error) {
        OvenPlayerConsole.log('WebRTC Loader closePeear()');
        if (!!ws) {
            OvenPlayerConsole.log('Closing websocket connection...');
            OvenPlayerConsole.log("Send Signaling : Stop.");
            ws.send(JSON.stringify({ command: "stop" }));
            ws.close();
            ws = null;
        }
        if (peerConnection) {
            OvenPlayerConsole.log('Closing peer connection...');
            if (statisticsTimer) {
                clearTimeout(statisticsTimer);
            }
            peerConnection.close();
            peerConnection = null;
        };
        if (error) {
            errorCallback(error);
        }
    }

    that.connect = function () {
        return initialize();
    };
    that.destroy = function () {
        closePeer();
    };
    return that;
};

exports.default = WebRTCLoader;

/***/ }),

/***/ "./src/js/utils/adapter.js":
/*!*********************************!*\
  !*** ./src/js/utils/adapter.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var require;var require;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (f) {
  if (( false ? undefined : _typeof(exports)) === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (f),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var g; }
})(function () {
  var define, module, exports;return function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;if (!u && a) return require(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
        }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
          var n = t[o][1][e];return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
      s(r[o]);
    }return s;
  }({ 1: [function (require, module, exports) {
      /*
       *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var SDPUtils = require('sdp');

      function writeMediaSection(transceiver, caps, type, stream, dtlsRole) {
        var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

        // Map ICE parameters (ufrag, pwd) to SDP.
        sdp += SDPUtils.writeIceParameters(transceiver.iceGatherer.getLocalParameters());

        // Map DTLS parameters to SDP.
        sdp += SDPUtils.writeDtlsParameters(transceiver.dtlsTransport.getLocalParameters(), type === 'offer' ? 'actpass' : dtlsRole || 'active');

        sdp += 'a=mid:' + transceiver.mid + '\r\n';

        if (transceiver.rtpSender && transceiver.rtpReceiver) {
          sdp += 'a=sendrecv\r\n';
        } else if (transceiver.rtpSender) {
          sdp += 'a=sendonly\r\n';
        } else if (transceiver.rtpReceiver) {
          sdp += 'a=recvonly\r\n';
        } else {
          sdp += 'a=inactive\r\n';
        }

        if (transceiver.rtpSender) {
          var trackId = transceiver.rtpSender._initialTrackId || transceiver.rtpSender.track.id;
          transceiver.rtpSender._initialTrackId = trackId;
          // spec.
          var msid = 'msid:' + (stream ? stream.id : '-') + ' ' + trackId + '\r\n';
          sdp += 'a=' + msid;
          // for Chrome. Legacy should no longer be required.
          sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc + ' ' + msid;

          // RTX
          if (transceiver.sendEncodingParameters[0].rtx) {
            sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc + ' ' + msid;
            sdp += 'a=ssrc-group:FID ' + transceiver.sendEncodingParameters[0].ssrc + ' ' + transceiver.sendEncodingParameters[0].rtx.ssrc + '\r\n';
          }
        }
        // FIXME: this should be written by writeRtpDescription.
        sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc + ' cname:' + SDPUtils.localCName + '\r\n';
        if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
          sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc + ' cname:' + SDPUtils.localCName + '\r\n';
        }
        return sdp;
      }

      // Edge does not like
      // 1) stun: filtered after 14393 unless ?transport=udp is present
      // 2) turn: that does not have all of turn:host:port?transport=udp
      // 3) turn: with ipv6 addresses
      // 4) turn: occurring muliple times
      function filterIceServers(iceServers, edgeVersion) {
        var hasTurn = false;
        iceServers = JSON.parse(JSON.stringify(iceServers));
        return iceServers.filter(function (server) {
          if (server && (server.urls || server.url)) {
            var urls = server.urls || server.url;
            if (server.url && !server.urls) {
              console.warn('RTCIceServer.url is deprecated! Use urls instead.');
            }
            var isString = typeof urls === 'string';
            if (isString) {
              urls = [urls];
            }
            urls = urls.filter(function (url) {
              var validTurn = url.indexOf('turn:') === 0 && url.indexOf('transport=udp') !== -1 && url.indexOf('turn:[') === -1 && !hasTurn;

              if (validTurn) {
                hasTurn = true;
                return true;
              }
              return url.indexOf('stun:') === 0 && edgeVersion >= 14393 && url.indexOf('?transport=udp') === -1;
            });

            delete server.url;
            server.urls = isString ? urls[0] : urls;
            return !!urls.length;
          }
        });
      }

      // Determines the intersection of local and remote capabilities.
      function getCommonCapabilities(localCapabilities, remoteCapabilities) {
        var commonCapabilities = {
          codecs: [],
          headerExtensions: [],
          fecMechanisms: []
        };

        var findCodecByPayloadType = function findCodecByPayloadType(pt, codecs) {
          pt = parseInt(pt, 10);
          for (var i = 0; i < codecs.length; i++) {
            if (codecs[i].payloadType === pt || codecs[i].preferredPayloadType === pt) {
              return codecs[i];
            }
          }
        };

        var rtxCapabilityMatches = function rtxCapabilityMatches(lRtx, rRtx, lCodecs, rCodecs) {
          var lCodec = findCodecByPayloadType(lRtx.parameters.apt, lCodecs);
          var rCodec = findCodecByPayloadType(rRtx.parameters.apt, rCodecs);
          return lCodec && rCodec && lCodec.name.toLowerCase() === rCodec.name.toLowerCase();
        };

        localCapabilities.codecs.forEach(function (lCodec) {
          for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
            var rCodec = remoteCapabilities.codecs[i];
            if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() && lCodec.clockRate === rCodec.clockRate) {
              if (lCodec.name.toLowerCase() === 'rtx' && lCodec.parameters && rCodec.parameters.apt) {
                // for RTX we need to find the local rtx that has a apt
                // which points to the same local codec as the remote one.
                if (!rtxCapabilityMatches(lCodec, rCodec, localCapabilities.codecs, remoteCapabilities.codecs)) {
                  continue;
                }
              }
              rCodec = JSON.parse(JSON.stringify(rCodec)); // deepcopy
              // number of channels is the highest common number of channels
              rCodec.numChannels = Math.min(lCodec.numChannels, rCodec.numChannels);
              // push rCodec so we reply with offerer payload type
              commonCapabilities.codecs.push(rCodec);

              // determine common feedback mechanisms
              rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function (fb) {
                for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
                  if (lCodec.rtcpFeedback[j].type === fb.type && lCodec.rtcpFeedback[j].parameter === fb.parameter) {
                    return true;
                  }
                }
                return false;
              });
              // FIXME: also need to determine .parameters
              //  see https://github.com/openpeer/ortc/issues/569
              break;
            }
          }
        });

        localCapabilities.headerExtensions.forEach(function (lHeaderExtension) {
          for (var i = 0; i < remoteCapabilities.headerExtensions.length; i++) {
            var rHeaderExtension = remoteCapabilities.headerExtensions[i];
            if (lHeaderExtension.uri === rHeaderExtension.uri) {
              commonCapabilities.headerExtensions.push(rHeaderExtension);
              break;
            }
          }
        });

        // FIXME: fecMechanisms
        return commonCapabilities;
      }

      // is action=setLocalDescription with type allowed in signalingState
      function isActionAllowedInSignalingState(action, type, signalingState) {
        return {
          offer: {
            setLocalDescription: ['stable', 'have-local-offer'],
            setRemoteDescription: ['stable', 'have-remote-offer']
          },
          answer: {
            setLocalDescription: ['have-remote-offer', 'have-local-pranswer'],
            setRemoteDescription: ['have-local-offer', 'have-remote-pranswer']
          }
        }[type][action].indexOf(signalingState) !== -1;
      }

      function maybeAddCandidate(iceTransport, candidate) {
        // Edge's internal representation adds some fields therefore
        // not all fieldѕ are taken into account.
        var alreadyAdded = iceTransport.getRemoteCandidates().find(function (remoteCandidate) {
          return candidate.foundation === remoteCandidate.foundation && candidate.ip === remoteCandidate.ip && candidate.port === remoteCandidate.port && candidate.priority === remoteCandidate.priority && candidate.protocol === remoteCandidate.protocol && candidate.type === remoteCandidate.type;
        });
        if (!alreadyAdded) {
          iceTransport.addRemoteCandidate(candidate);
        }
        return !alreadyAdded;
      }

      function makeError(name, description) {
        var e = new Error(description);
        e.name = name;
        // legacy error codes from https://heycam.github.io/webidl/#idl-DOMException-error-names
        e.code = {
          NotSupportedError: 9,
          InvalidStateError: 11,
          InvalidAccessError: 15,
          TypeError: undefined,
          OperationError: undefined
        }[name];
        return e;
      }

      module.exports = function (window, edgeVersion) {
        // https://w3c.github.io/mediacapture-main/#mediastream
        // Helper function to add the track to the stream and
        // dispatch the event ourselves.
        function addTrackToStreamAndFireEvent(track, stream) {
          stream.addTrack(track);
          stream.dispatchEvent(new window.MediaStreamTrackEvent('addtrack', { track: track }));
        }

        function removeTrackFromStreamAndFireEvent(track, stream) {
          stream.removeTrack(track);
          stream.dispatchEvent(new window.MediaStreamTrackEvent('removetrack', { track: track }));
        }

        function fireAddTrack(pc, track, receiver, streams) {
          var trackEvent = new Event('track');
          trackEvent.track = track;
          trackEvent.receiver = receiver;
          trackEvent.transceiver = { receiver: receiver };
          trackEvent.streams = streams;
          window.setTimeout(function () {
            pc._dispatchEvent('track', trackEvent);
          });
        }

        var RTCPeerConnection = function RTCPeerConnection(config) {
          var pc = this;

          var _eventTarget = document.createDocumentFragment();
          ['addEventListener', 'removeEventListener', 'dispatchEvent'].forEach(function (method) {
            pc[method] = _eventTarget[method].bind(_eventTarget);
          });

          this.canTrickleIceCandidates = null;

          this.needNegotiation = false;

          this.localStreams = [];
          this.remoteStreams = [];

          this.localDescription = null;
          this.remoteDescription = null;

          this.signalingState = 'stable';
          this.iceConnectionState = 'new';
          this.connectionState = 'new';
          this.iceGatheringState = 'new';

          config = JSON.parse(JSON.stringify(config || {}));

          this.usingBundle = config.bundlePolicy === 'max-bundle';
          if (config.rtcpMuxPolicy === 'negotiate') {
            throw makeError('NotSupportedError', 'rtcpMuxPolicy \'negotiate\' is not supported');
          } else if (!config.rtcpMuxPolicy) {
            config.rtcpMuxPolicy = 'require';
          }

          switch (config.iceTransportPolicy) {
            case 'all':
            case 'relay':
              break;
            default:
              config.iceTransportPolicy = 'all';
              break;
          }

          switch (config.bundlePolicy) {
            case 'balanced':
            case 'max-compat':
            case 'max-bundle':
              break;
            default:
              config.bundlePolicy = 'balanced';
              break;
          }

          config.iceServers = filterIceServers(config.iceServers || [], edgeVersion);

          this._iceGatherers = [];
          if (config.iceCandidatePoolSize) {
            for (var i = config.iceCandidatePoolSize; i > 0; i--) {
              this._iceGatherers.push(new window.RTCIceGatherer({
                iceServers: config.iceServers,
                gatherPolicy: config.iceTransportPolicy
              }));
            }
          } else {
            config.iceCandidatePoolSize = 0;
          }

          this._config = config;

          // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
          // everything that is needed to describe a SDP m-line.
          this.transceivers = [];

          this._sdpSessionId = SDPUtils.generateSessionId();
          this._sdpSessionVersion = 0;

          this._dtlsRole = undefined; // role for a=setup to use in answers.

          this._isClosed = false;
        };

        // set up event handlers on prototype
        RTCPeerConnection.prototype.onicecandidate = null;
        RTCPeerConnection.prototype.onaddstream = null;
        RTCPeerConnection.prototype.ontrack = null;
        RTCPeerConnection.prototype.onremovestream = null;
        RTCPeerConnection.prototype.onsignalingstatechange = null;
        RTCPeerConnection.prototype.oniceconnectionstatechange = null;
        RTCPeerConnection.prototype.onconnectionstatechange = null;
        RTCPeerConnection.prototype.onicegatheringstatechange = null;
        RTCPeerConnection.prototype.onnegotiationneeded = null;
        RTCPeerConnection.prototype.ondatachannel = null;

        RTCPeerConnection.prototype._dispatchEvent = function (name, event) {
          if (this._isClosed) {
            return;
          }
          this.dispatchEvent(event);
          if (typeof this['on' + name] === 'function') {
            this['on' + name](event);
          }
        };

        RTCPeerConnection.prototype._emitGatheringStateChange = function () {
          var event = new Event('icegatheringstatechange');
          this._dispatchEvent('icegatheringstatechange', event);
        };

        RTCPeerConnection.prototype.getConfiguration = function () {
          return this._config;
        };

        RTCPeerConnection.prototype.getLocalStreams = function () {
          return this.localStreams;
        };

        RTCPeerConnection.prototype.getRemoteStreams = function () {
          return this.remoteStreams;
        };

        // internal helper to create a transceiver object.
        // (which is not yet the same as the WebRTC 1.0 transceiver)
        RTCPeerConnection.prototype._createTransceiver = function (kind, doNotAdd) {
          var hasBundleTransport = this.transceivers.length > 0;
          var transceiver = {
            track: null,
            iceGatherer: null,
            iceTransport: null,
            dtlsTransport: null,
            localCapabilities: null,
            remoteCapabilities: null,
            rtpSender: null,
            rtpReceiver: null,
            kind: kind,
            mid: null,
            sendEncodingParameters: null,
            recvEncodingParameters: null,
            stream: null,
            associatedRemoteMediaStreams: [],
            wantReceive: true
          };
          if (this.usingBundle && hasBundleTransport) {
            transceiver.iceTransport = this.transceivers[0].iceTransport;
            transceiver.dtlsTransport = this.transceivers[0].dtlsTransport;
          } else {
            var transports = this._createIceAndDtlsTransports();
            transceiver.iceTransport = transports.iceTransport;
            transceiver.dtlsTransport = transports.dtlsTransport;
          }
          if (!doNotAdd) {
            this.transceivers.push(transceiver);
          }
          return transceiver;
        };

        RTCPeerConnection.prototype.addTrack = function (track, stream) {
          if (this._isClosed) {
            throw makeError('InvalidStateError', 'Attempted to call addTrack on a closed peerconnection.');
          }

          var alreadyExists = this.transceivers.find(function (s) {
            return s.track === track;
          });

          if (alreadyExists) {
            throw makeError('InvalidAccessError', 'Track already exists.');
          }

          var transceiver;
          for (var i = 0; i < this.transceivers.length; i++) {
            if (!this.transceivers[i].track && this.transceivers[i].kind === track.kind) {
              transceiver = this.transceivers[i];
            }
          }
          if (!transceiver) {
            transceiver = this._createTransceiver(track.kind);
          }

          this._maybeFireNegotiationNeeded();

          if (this.localStreams.indexOf(stream) === -1) {
            this.localStreams.push(stream);
          }

          transceiver.track = track;
          transceiver.stream = stream;
          transceiver.rtpSender = new window.RTCRtpSender(track, transceiver.dtlsTransport);
          return transceiver.rtpSender;
        };

        RTCPeerConnection.prototype.addStream = function (stream) {
          var pc = this;
          if (edgeVersion >= 15025) {
            stream.getTracks().forEach(function (track) {
              pc.addTrack(track, stream);
            });
          } else {
            // Clone is necessary for local demos mostly, attaching directly
            // to two different senders does not work (build 10547).
            // Fixed in 15025 (or earlier)
            var clonedStream = stream.clone();
            stream.getTracks().forEach(function (track, idx) {
              var clonedTrack = clonedStream.getTracks()[idx];
              track.addEventListener('enabled', function (event) {
                clonedTrack.enabled = event.enabled;
              });
            });
            clonedStream.getTracks().forEach(function (track) {
              pc.addTrack(track, clonedStream);
            });
          }
        };

        RTCPeerConnection.prototype.removeTrack = function (sender) {
          if (this._isClosed) {
            throw makeError('InvalidStateError', 'Attempted to call removeTrack on a closed peerconnection.');
          }

          if (!(sender instanceof window.RTCRtpSender)) {
            throw new TypeError('Argument 1 of RTCPeerConnection.removeTrack ' + 'does not implement interface RTCRtpSender.');
          }

          var transceiver = this.transceivers.find(function (t) {
            return t.rtpSender === sender;
          });

          if (!transceiver) {
            throw makeError('InvalidAccessError', 'Sender was not created by this connection.');
          }
          var stream = transceiver.stream;

          transceiver.rtpSender.stop();
          transceiver.rtpSender = null;
          transceiver.track = null;
          transceiver.stream = null;

          // remove the stream from the set of local streams
          var localStreams = this.transceivers.map(function (t) {
            return t.stream;
          });
          if (localStreams.indexOf(stream) === -1 && this.localStreams.indexOf(stream) > -1) {
            this.localStreams.splice(this.localStreams.indexOf(stream), 1);
          }

          this._maybeFireNegotiationNeeded();
        };

        RTCPeerConnection.prototype.removeStream = function (stream) {
          var pc = this;
          stream.getTracks().forEach(function (track) {
            var sender = pc.getSenders().find(function (s) {
              return s.track === track;
            });
            if (sender) {
              pc.removeTrack(sender);
            }
          });
        };

        RTCPeerConnection.prototype.getSenders = function () {
          return this.transceivers.filter(function (transceiver) {
            return !!transceiver.rtpSender;
          }).map(function (transceiver) {
            return transceiver.rtpSender;
          });
        };

        RTCPeerConnection.prototype.getReceivers = function () {
          return this.transceivers.filter(function (transceiver) {
            return !!transceiver.rtpReceiver;
          }).map(function (transceiver) {
            return transceiver.rtpReceiver;
          });
        };

        RTCPeerConnection.prototype._createIceGatherer = function (sdpMLineIndex, usingBundle) {
          var pc = this;
          if (usingBundle && sdpMLineIndex > 0) {
            return this.transceivers[0].iceGatherer;
          } else if (this._iceGatherers.length) {
            return this._iceGatherers.shift();
          }
          var iceGatherer = new window.RTCIceGatherer({
            iceServers: this._config.iceServers,
            gatherPolicy: this._config.iceTransportPolicy
          });
          Object.defineProperty(iceGatherer, 'state', { value: 'new', writable: true });

          this.transceivers[sdpMLineIndex].bufferedCandidateEvents = [];
          this.transceivers[sdpMLineIndex].bufferCandidates = function (event) {
            var end = !event.candidate || Object.keys(event.candidate).length === 0;
            // polyfill since RTCIceGatherer.state is not implemented in
            // Edge 10547 yet.
            iceGatherer.state = end ? 'completed' : 'gathering';
            if (pc.transceivers[sdpMLineIndex].bufferedCandidateEvents !== null) {
              pc.transceivers[sdpMLineIndex].bufferedCandidateEvents.push(event);
            }
          };
          iceGatherer.addEventListener('localcandidate', this.transceivers[sdpMLineIndex].bufferCandidates);
          return iceGatherer;
        };

        // start gathering from an RTCIceGatherer.
        RTCPeerConnection.prototype._gather = function (mid, sdpMLineIndex) {
          var pc = this;
          var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
          if (iceGatherer.onlocalcandidate) {
            return;
          }
          var bufferedCandidateEvents = this.transceivers[sdpMLineIndex].bufferedCandidateEvents;
          this.transceivers[sdpMLineIndex].bufferedCandidateEvents = null;
          iceGatherer.removeEventListener('localcandidate', this.transceivers[sdpMLineIndex].bufferCandidates);
          iceGatherer.onlocalcandidate = function (evt) {
            if (pc.usingBundle && sdpMLineIndex > 0) {
              // if we know that we use bundle we can drop candidates with
              // ѕdpMLineIndex > 0. If we don't do this then our state gets
              // confused since we dispose the extra ice gatherer.
              return;
            }
            var event = new Event('icecandidate');
            event.candidate = { sdpMid: mid, sdpMLineIndex: sdpMLineIndex };

            var cand = evt.candidate;
            // Edge emits an empty object for RTCIceCandidateComplete‥
            var end = !cand || Object.keys(cand).length === 0;
            if (end) {
              // polyfill since RTCIceGatherer.state is not implemented in
              // Edge 10547 yet.
              if (iceGatherer.state === 'new' || iceGatherer.state === 'gathering') {
                iceGatherer.state = 'completed';
              }
            } else {
              if (iceGatherer.state === 'new') {
                iceGatherer.state = 'gathering';
              }
              // RTCIceCandidate doesn't have a component, needs to be added
              cand.component = 1;
              // also the usernameFragment. TODO: update SDP to take both variants.
              cand.ufrag = iceGatherer.getLocalParameters().usernameFragment;

              var serializedCandidate = SDPUtils.writeCandidate(cand);
              event.candidate = _extends(event.candidate, SDPUtils.parseCandidate(serializedCandidate));

              event.candidate.candidate = serializedCandidate;
              event.candidate.toJSON = function () {
                return {
                  candidate: event.candidate.candidate,
                  sdpMid: event.candidate.sdpMid,
                  sdpMLineIndex: event.candidate.sdpMLineIndex,
                  usernameFragment: event.candidate.usernameFragment
                };
              };
            }

            // update local description.
            var sections = SDPUtils.getMediaSections(pc.localDescription.sdp);
            if (!end) {
              sections[event.candidate.sdpMLineIndex] += 'a=' + event.candidate.candidate + '\r\n';
            } else {
              sections[event.candidate.sdpMLineIndex] += 'a=end-of-candidates\r\n';
            }
            pc.localDescription.sdp = SDPUtils.getDescription(pc.localDescription.sdp) + sections.join('');
            var complete = pc.transceivers.every(function (transceiver) {
              return transceiver.iceGatherer && transceiver.iceGatherer.state === 'completed';
            });

            if (pc.iceGatheringState !== 'gathering') {
              pc.iceGatheringState = 'gathering';
              pc._emitGatheringStateChange();
            }

            // Emit candidate. Also emit null candidate when all gatherers are
            // complete.
            if (!end) {
              pc._dispatchEvent('icecandidate', event);
            }
            if (complete) {
              pc._dispatchEvent('icecandidate', new Event('icecandidate'));
              pc.iceGatheringState = 'complete';
              pc._emitGatheringStateChange();
            }
          };

          // emit already gathered candidates.
          window.setTimeout(function () {
            bufferedCandidateEvents.forEach(function (e) {
              iceGatherer.onlocalcandidate(e);
            });
          }, 0);
        };

        // Create ICE transport and DTLS transport.
        RTCPeerConnection.prototype._createIceAndDtlsTransports = function () {
          var pc = this;
          var iceTransport = new window.RTCIceTransport(null);
          iceTransport.onicestatechange = function () {
            pc._updateIceConnectionState();
            pc._updateConnectionState();
          };

          var dtlsTransport = new window.RTCDtlsTransport(iceTransport);
          dtlsTransport.ondtlsstatechange = function () {
            pc._updateConnectionState();
          };
          dtlsTransport.onerror = function () {
            // onerror does not set state to failed by itself.
            Object.defineProperty(dtlsTransport, 'state', { value: 'failed', writable: true });
            pc._updateConnectionState();
          };

          return {
            iceTransport: iceTransport,
            dtlsTransport: dtlsTransport
          };
        };

        // Destroy ICE gatherer, ICE transport and DTLS transport.
        // Without triggering the callbacks.
        RTCPeerConnection.prototype._disposeIceAndDtlsTransports = function (sdpMLineIndex) {
          var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
          if (iceGatherer) {
            delete iceGatherer.onlocalcandidate;
            delete this.transceivers[sdpMLineIndex].iceGatherer;
          }
          var iceTransport = this.transceivers[sdpMLineIndex].iceTransport;
          if (iceTransport) {
            delete iceTransport.onicestatechange;
            delete this.transceivers[sdpMLineIndex].iceTransport;
          }
          var dtlsTransport = this.transceivers[sdpMLineIndex].dtlsTransport;
          if (dtlsTransport) {
            delete dtlsTransport.ondtlsstatechange;
            delete dtlsTransport.onerror;
            delete this.transceivers[sdpMLineIndex].dtlsTransport;
          }
        };

        // Start the RTP Sender and Receiver for a transceiver.
        RTCPeerConnection.prototype._transceive = function (transceiver, send, recv) {
          var params = getCommonCapabilities(transceiver.localCapabilities, transceiver.remoteCapabilities);
          if (send && transceiver.rtpSender) {
            params.encodings = transceiver.sendEncodingParameters;
            params.rtcp = {
              cname: SDPUtils.localCName,
              compound: transceiver.rtcpParameters.compound
            };
            if (transceiver.recvEncodingParameters.length) {
              params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
            }
            transceiver.rtpSender.send(params);
          }
          if (recv && transceiver.rtpReceiver && params.codecs.length > 0) {
            // remove RTX field in Edge 14942
            if (transceiver.kind === 'video' && transceiver.recvEncodingParameters && edgeVersion < 15019) {
              transceiver.recvEncodingParameters.forEach(function (p) {
                delete p.rtx;
              });
            }
            if (transceiver.recvEncodingParameters.length) {
              params.encodings = transceiver.recvEncodingParameters;
            } else {
              params.encodings = [{}];
            }
            params.rtcp = {
              compound: transceiver.rtcpParameters.compound
            };
            if (transceiver.rtcpParameters.cname) {
              params.rtcp.cname = transceiver.rtcpParameters.cname;
            }
            if (transceiver.sendEncodingParameters.length) {
              params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
            }
            transceiver.rtpReceiver.receive(params);
          }
        };

        RTCPeerConnection.prototype.setLocalDescription = function (description) {
          var pc = this;

          // Note: pranswer is not supported.
          if (['offer', 'answer'].indexOf(description.type) === -1) {
            return Promise.reject(makeError('TypeError', 'Unsupported type "' + description.type + '"'));
          }

          if (!isActionAllowedInSignalingState('setLocalDescription', description.type, pc.signalingState) || pc._isClosed) {
            return Promise.reject(makeError('InvalidStateError', 'Can not set local ' + description.type + ' in state ' + pc.signalingState));
          }

          var sections;
          var sessionpart;
          if (description.type === 'offer') {
            // VERY limited support for SDP munging. Limited to:
            // * changing the order of codecs
            sections = SDPUtils.splitSections(description.sdp);
            sessionpart = sections.shift();
            sections.forEach(function (mediaSection, sdpMLineIndex) {
              var caps = SDPUtils.parseRtpParameters(mediaSection);
              pc.transceivers[sdpMLineIndex].localCapabilities = caps;
            });

            pc.transceivers.forEach(function (transceiver, sdpMLineIndex) {
              pc._gather(transceiver.mid, sdpMLineIndex);
            });
          } else if (description.type === 'answer') {
            sections = SDPUtils.splitSections(pc.remoteDescription.sdp);
            sessionpart = sections.shift();
            var isIceLite = SDPUtils.matchPrefix(sessionpart, 'a=ice-lite').length > 0;
            sections.forEach(function (mediaSection, sdpMLineIndex) {
              var transceiver = pc.transceivers[sdpMLineIndex];
              var iceGatherer = transceiver.iceGatherer;
              var iceTransport = transceiver.iceTransport;
              var dtlsTransport = transceiver.dtlsTransport;
              var localCapabilities = transceiver.localCapabilities;
              var remoteCapabilities = transceiver.remoteCapabilities;

              // treat bundle-only as not-rejected.
              var rejected = SDPUtils.isRejected(mediaSection) && SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 0;

              if (!rejected && !transceiver.rejected) {
                var remoteIceParameters = SDPUtils.getIceParameters(mediaSection, sessionpart);
                var remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection, sessionpart);
                if (isIceLite) {
                  remoteDtlsParameters.role = 'server';
                }

                if (!pc.usingBundle || sdpMLineIndex === 0) {
                  pc._gather(transceiver.mid, sdpMLineIndex);
                  if (iceTransport.state === 'new') {
                    iceTransport.start(iceGatherer, remoteIceParameters, isIceLite ? 'controlling' : 'controlled');
                  }
                  if (dtlsTransport.state === 'new') {
                    dtlsTransport.start(remoteDtlsParameters);
                  }
                }

                // Calculate intersection of capabilities.
                var params = getCommonCapabilities(localCapabilities, remoteCapabilities);

                // Start the RTCRtpSender. The RTCRtpReceiver for this
                // transceiver has already been started in setRemoteDescription.
                pc._transceive(transceiver, params.codecs.length > 0, false);
              }
            });
          }

          pc.localDescription = {
            type: description.type,
            sdp: description.sdp
          };
          if (description.type === 'offer') {
            pc._updateSignalingState('have-local-offer');
          } else {
            pc._updateSignalingState('stable');
          }

          return Promise.resolve();
        };

        RTCPeerConnection.prototype.setRemoteDescription = function (description) {
          var pc = this;

          // Note: pranswer is not supported.
          if (['offer', 'answer'].indexOf(description.type) === -1) {
            return Promise.reject(makeError('TypeError', 'Unsupported type "' + description.type + '"'));
          }

          if (!isActionAllowedInSignalingState('setRemoteDescription', description.type, pc.signalingState) || pc._isClosed) {
            return Promise.reject(makeError('InvalidStateError', 'Can not set remote ' + description.type + ' in state ' + pc.signalingState));
          }

          var streams = {};
          pc.remoteStreams.forEach(function (stream) {
            streams[stream.id] = stream;
          });
          var receiverList = [];
          var sections = SDPUtils.splitSections(description.sdp);
          var sessionpart = sections.shift();
          var isIceLite = SDPUtils.matchPrefix(sessionpart, 'a=ice-lite').length > 0;
          var usingBundle = SDPUtils.matchPrefix(sessionpart, 'a=group:BUNDLE ').length > 0;
          pc.usingBundle = usingBundle;
          var iceOptions = SDPUtils.matchPrefix(sessionpart, 'a=ice-options:')[0];
          if (iceOptions) {
            pc.canTrickleIceCandidates = iceOptions.substr(14).split(' ').indexOf('trickle') >= 0;
          } else {
            pc.canTrickleIceCandidates = false;
          }

          sections.forEach(function (mediaSection, sdpMLineIndex) {
            var lines = SDPUtils.splitLines(mediaSection);
            var kind = SDPUtils.getKind(mediaSection);
            // treat bundle-only as not-rejected.
            var rejected = SDPUtils.isRejected(mediaSection) && SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 0;
            var protocol = lines[0].substr(2).split(' ')[2];

            var direction = SDPUtils.getDirection(mediaSection, sessionpart);
            var remoteMsid = SDPUtils.parseMsid(mediaSection);

            var mid = SDPUtils.getMid(mediaSection) || SDPUtils.generateIdentifier();

            // Reject datachannels which are not implemented yet.
            if (kind === 'application' && protocol === 'DTLS/SCTP' || rejected) {
              // TODO: this is dangerous in the case where a non-rejected m-line
              //     becomes rejected.
              pc.transceivers[sdpMLineIndex] = {
                mid: mid,
                kind: kind,
                rejected: true
              };
              return;
            }

            if (!rejected && pc.transceivers[sdpMLineIndex] && pc.transceivers[sdpMLineIndex].rejected) {
              // recycle a rejected transceiver.
              pc.transceivers[sdpMLineIndex] = pc._createTransceiver(kind, true);
            }

            var transceiver;
            var iceGatherer;
            var iceTransport;
            var dtlsTransport;
            var rtpReceiver;
            var sendEncodingParameters;
            var recvEncodingParameters;
            var localCapabilities;

            var track;
            // FIXME: ensure the mediaSection has rtcp-mux set.
            var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
            var remoteIceParameters;
            var remoteDtlsParameters;
            if (!rejected) {
              remoteIceParameters = SDPUtils.getIceParameters(mediaSection, sessionpart);
              remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection, sessionpart);
              remoteDtlsParameters.role = 'client';
            }
            recvEncodingParameters = SDPUtils.parseRtpEncodingParameters(mediaSection);

            var rtcpParameters = SDPUtils.parseRtcpParameters(mediaSection);

            var isComplete = SDPUtils.matchPrefix(mediaSection, 'a=end-of-candidates', sessionpart).length > 0;
            var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:').map(function (cand) {
              return SDPUtils.parseCandidate(cand);
            }).filter(function (cand) {
              return cand.component === 1;
            });

            // Check if we can use BUNDLE and dispose transports.
            if ((description.type === 'offer' || description.type === 'answer') && !rejected && usingBundle && sdpMLineIndex > 0 && pc.transceivers[sdpMLineIndex]) {
              pc._disposeIceAndDtlsTransports(sdpMLineIndex);
              pc.transceivers[sdpMLineIndex].iceGatherer = pc.transceivers[0].iceGatherer;
              pc.transceivers[sdpMLineIndex].iceTransport = pc.transceivers[0].iceTransport;
              pc.transceivers[sdpMLineIndex].dtlsTransport = pc.transceivers[0].dtlsTransport;
              if (pc.transceivers[sdpMLineIndex].rtpSender) {
                pc.transceivers[sdpMLineIndex].rtpSender.setTransport(pc.transceivers[0].dtlsTransport);
              }
              if (pc.transceivers[sdpMLineIndex].rtpReceiver) {
                pc.transceivers[sdpMLineIndex].rtpReceiver.setTransport(pc.transceivers[0].dtlsTransport);
              }
            }
            if (description.type === 'offer' && !rejected) {
              transceiver = pc.transceivers[sdpMLineIndex] || pc._createTransceiver(kind);
              transceiver.mid = mid;

              if (!transceiver.iceGatherer) {
                transceiver.iceGatherer = pc._createIceGatherer(sdpMLineIndex, usingBundle);
              }

              if (cands.length && transceiver.iceTransport.state === 'new') {
                if (isComplete && (!usingBundle || sdpMLineIndex === 0)) {
                  transceiver.iceTransport.setRemoteCandidates(cands);
                } else {
                  cands.forEach(function (candidate) {
                    maybeAddCandidate(transceiver.iceTransport, candidate);
                  });
                }
              }

              localCapabilities = window.RTCRtpReceiver.getCapabilities(kind);

              // filter RTX until additional stuff needed for RTX is implemented
              // in adapter.js
              if (edgeVersion < 15019) {
                localCapabilities.codecs = localCapabilities.codecs.filter(function (codec) {
                  return codec.name !== 'rtx';
                });
              }

              sendEncodingParameters = transceiver.sendEncodingParameters || [{
                ssrc: (2 * sdpMLineIndex + 2) * 1001
              }];

              // TODO: rewrite to use http://w3c.github.io/webrtc-pc/#set-associated-remote-streams
              var isNewTrack = false;
              if (direction === 'sendrecv' || direction === 'sendonly') {
                isNewTrack = !transceiver.rtpReceiver;
                rtpReceiver = transceiver.rtpReceiver || new window.RTCRtpReceiver(transceiver.dtlsTransport, kind);

                if (isNewTrack) {
                  var stream;
                  track = rtpReceiver.track;
                  // FIXME: does not work with Plan B.
                  if (remoteMsid && remoteMsid.stream === '-') {
                    // no-op. a stream id of '-' means: no associated stream.
                  } else if (remoteMsid) {
                    if (!streams[remoteMsid.stream]) {
                      streams[remoteMsid.stream] = new window.MediaStream();
                      Object.defineProperty(streams[remoteMsid.stream], 'id', {
                        get: function get() {
                          return remoteMsid.stream;
                        }
                      });
                    }
                    Object.defineProperty(track, 'id', {
                      get: function get() {
                        return remoteMsid.track;
                      }
                    });
                    stream = streams[remoteMsid.stream];
                  } else {
                    if (!streams.default) {
                      streams.default = new window.MediaStream();
                    }
                    stream = streams.default;
                  }
                  if (stream) {
                    addTrackToStreamAndFireEvent(track, stream);
                    transceiver.associatedRemoteMediaStreams.push(stream);
                  }
                  receiverList.push([track, rtpReceiver, stream]);
                }
              } else if (transceiver.rtpReceiver && transceiver.rtpReceiver.track) {
                transceiver.associatedRemoteMediaStreams.forEach(function (s) {
                  var nativeTrack = s.getTracks().find(function (t) {
                    return t.id === transceiver.rtpReceiver.track.id;
                  });
                  if (nativeTrack) {
                    removeTrackFromStreamAndFireEvent(nativeTrack, s);
                  }
                });
                transceiver.associatedRemoteMediaStreams = [];
              }

              transceiver.localCapabilities = localCapabilities;
              transceiver.remoteCapabilities = remoteCapabilities;
              transceiver.rtpReceiver = rtpReceiver;
              transceiver.rtcpParameters = rtcpParameters;
              transceiver.sendEncodingParameters = sendEncodingParameters;
              transceiver.recvEncodingParameters = recvEncodingParameters;

              // Start the RTCRtpReceiver now. The RTPSender is started in
              // setLocalDescription.
              pc._transceive(pc.transceivers[sdpMLineIndex], false, isNewTrack);
            } else if (description.type === 'answer' && !rejected) {
              transceiver = pc.transceivers[sdpMLineIndex];
              iceGatherer = transceiver.iceGatherer;
              iceTransport = transceiver.iceTransport;
              dtlsTransport = transceiver.dtlsTransport;
              rtpReceiver = transceiver.rtpReceiver;
              sendEncodingParameters = transceiver.sendEncodingParameters;
              localCapabilities = transceiver.localCapabilities;

              pc.transceivers[sdpMLineIndex].recvEncodingParameters = recvEncodingParameters;
              pc.transceivers[sdpMLineIndex].remoteCapabilities = remoteCapabilities;
              pc.transceivers[sdpMLineIndex].rtcpParameters = rtcpParameters;

              if (cands.length && iceTransport.state === 'new') {
                if ((isIceLite || isComplete) && (!usingBundle || sdpMLineIndex === 0)) {
                  iceTransport.setRemoteCandidates(cands);
                } else {
                  cands.forEach(function (candidate) {
                    maybeAddCandidate(transceiver.iceTransport, candidate);
                  });
                }
              }

              if (!usingBundle || sdpMLineIndex === 0) {
                if (iceTransport.state === 'new') {
                  iceTransport.start(iceGatherer, remoteIceParameters, 'controlling');
                }
                if (dtlsTransport.state === 'new') {
                  dtlsTransport.start(remoteDtlsParameters);
                }
              }

              pc._transceive(transceiver, direction === 'sendrecv' || direction === 'recvonly', direction === 'sendrecv' || direction === 'sendonly');

              // TODO: rewrite to use http://w3c.github.io/webrtc-pc/#set-associated-remote-streams
              if (rtpReceiver && (direction === 'sendrecv' || direction === 'sendonly')) {
                track = rtpReceiver.track;
                if (remoteMsid) {
                  if (!streams[remoteMsid.stream]) {
                    streams[remoteMsid.stream] = new window.MediaStream();
                  }
                  addTrackToStreamAndFireEvent(track, streams[remoteMsid.stream]);
                  receiverList.push([track, rtpReceiver, streams[remoteMsid.stream]]);
                } else {
                  if (!streams.default) {
                    streams.default = new window.MediaStream();
                  }
                  addTrackToStreamAndFireEvent(track, streams.default);
                  receiverList.push([track, rtpReceiver, streams.default]);
                }
              } else {
                // FIXME: actually the receiver should be created later.
                delete transceiver.rtpReceiver;
              }
            }
          });

          if (pc._dtlsRole === undefined) {
            pc._dtlsRole = description.type === 'offer' ? 'active' : 'passive';
          }

          pc.remoteDescription = {
            type: description.type,
            sdp: description.sdp
          };
          if (description.type === 'offer') {
            pc._updateSignalingState('have-remote-offer');
          } else {
            pc._updateSignalingState('stable');
          }
          Object.keys(streams).forEach(function (sid) {
            var stream = streams[sid];
            if (stream.getTracks().length) {
              if (pc.remoteStreams.indexOf(stream) === -1) {
                pc.remoteStreams.push(stream);
                var event = new Event('addstream');
                event.stream = stream;
                window.setTimeout(function () {
                  pc._dispatchEvent('addstream', event);
                });
              }

              receiverList.forEach(function (item) {
                var track = item[0];
                var receiver = item[1];
                if (stream.id !== item[2].id) {
                  return;
                }
                fireAddTrack(pc, track, receiver, [stream]);
              });
            }
          });
          receiverList.forEach(function (item) {
            if (item[2]) {
              return;
            }
            fireAddTrack(pc, item[0], item[1], []);
          });

          // check whether addIceCandidate({}) was called within four seconds after
          // setRemoteDescription.
          window.setTimeout(function () {
            if (!(pc && pc.transceivers)) {
              return;
            }
            pc.transceivers.forEach(function (transceiver) {
              if (transceiver.iceTransport && transceiver.iceTransport.state === 'new' && transceiver.iceTransport.getRemoteCandidates().length > 0) {
                console.warn('Timeout for addRemoteCandidate. Consider sending ' + 'an end-of-candidates notification');
                transceiver.iceTransport.addRemoteCandidate({});
              }
            });
          }, 4000);

          return Promise.resolve();
        };

        RTCPeerConnection.prototype.close = function () {
          this.transceivers.forEach(function (transceiver) {
            /* not yet
            if (transceiver.iceGatherer) {
              transceiver.iceGatherer.close();
            }
            */
            if (transceiver.iceTransport) {
              transceiver.iceTransport.stop();
            }
            if (transceiver.dtlsTransport) {
              transceiver.dtlsTransport.stop();
            }
            if (transceiver.rtpSender) {
              transceiver.rtpSender.stop();
            }
            if (transceiver.rtpReceiver) {
              transceiver.rtpReceiver.stop();
            }
          });
          // FIXME: clean up tracks, local streams, remote streams, etc
          this._isClosed = true;
          this._updateSignalingState('closed');
        };

        // Update the signaling state.
        RTCPeerConnection.prototype._updateSignalingState = function (newState) {
          this.signalingState = newState;
          var event = new Event('signalingstatechange');
          this._dispatchEvent('signalingstatechange', event);
        };

        // Determine whether to fire the negotiationneeded event.
        RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function () {
          var pc = this;
          if (this.signalingState !== 'stable' || this.needNegotiation === true) {
            return;
          }
          this.needNegotiation = true;
          window.setTimeout(function () {
            if (pc.needNegotiation) {
              pc.needNegotiation = false;
              var event = new Event('negotiationneeded');
              pc._dispatchEvent('negotiationneeded', event);
            }
          }, 0);
        };

        // Update the ice connection state.
        RTCPeerConnection.prototype._updateIceConnectionState = function () {
          var newState;
          var states = {
            'new': 0,
            closed: 0,
            checking: 0,
            connected: 0,
            completed: 0,
            disconnected: 0,
            failed: 0
          };
          this.transceivers.forEach(function (transceiver) {
            states[transceiver.iceTransport.state]++;
          });

          newState = 'new';
          if (states.failed > 0) {
            newState = 'failed';
          } else if (states.checking > 0) {
            newState = 'checking';
          } else if (states.disconnected > 0) {
            newState = 'disconnected';
          } else if (states.new > 0) {
            newState = 'new';
          } else if (states.connected > 0) {
            newState = 'connected';
          } else if (states.completed > 0) {
            newState = 'completed';
          }

          if (newState !== this.iceConnectionState) {
            this.iceConnectionState = newState;
            var event = new Event('iceconnectionstatechange');
            this._dispatchEvent('iceconnectionstatechange', event);
          }
        };

        // Update the connection state.
        RTCPeerConnection.prototype._updateConnectionState = function () {
          var newState;
          var states = {
            'new': 0,
            closed: 0,
            connecting: 0,
            connected: 0,
            completed: 0,
            disconnected: 0,
            failed: 0
          };
          this.transceivers.forEach(function (transceiver) {
            states[transceiver.iceTransport.state]++;
            states[transceiver.dtlsTransport.state]++;
          });
          // ICETransport.completed and connected are the same for this purpose.
          states.connected += states.completed;

          newState = 'new';
          if (states.failed > 0) {
            newState = 'failed';
          } else if (states.connecting > 0) {
            newState = 'connecting';
          } else if (states.disconnected > 0) {
            newState = 'disconnected';
          } else if (states.new > 0) {
            newState = 'new';
          } else if (states.connected > 0) {
            newState = 'connected';
          }

          if (newState !== this.connectionState) {
            this.connectionState = newState;
            var event = new Event('connectionstatechange');
            this._dispatchEvent('connectionstatechange', event);
          }
        };

        RTCPeerConnection.prototype.createOffer = function () {
          var pc = this;

          if (pc._isClosed) {
            return Promise.reject(makeError('InvalidStateError', 'Can not call createOffer after close'));
          }

          var numAudioTracks = pc.transceivers.filter(function (t) {
            return t.kind === 'audio';
          }).length;
          var numVideoTracks = pc.transceivers.filter(function (t) {
            return t.kind === 'video';
          }).length;

          // Determine number of audio and video tracks we need to send/recv.
          var offerOptions = arguments[0];
          if (offerOptions) {
            // Reject Chrome legacy constraints.
            if (offerOptions.mandatory || offerOptions.optional) {
              throw new TypeError('Legacy mandatory/optional constraints not supported.');
            }
            if (offerOptions.offerToReceiveAudio !== undefined) {
              if (offerOptions.offerToReceiveAudio === true) {
                numAudioTracks = 1;
              } else if (offerOptions.offerToReceiveAudio === false) {
                numAudioTracks = 0;
              } else {
                numAudioTracks = offerOptions.offerToReceiveAudio;
              }
            }
            if (offerOptions.offerToReceiveVideo !== undefined) {
              if (offerOptions.offerToReceiveVideo === true) {
                numVideoTracks = 1;
              } else if (offerOptions.offerToReceiveVideo === false) {
                numVideoTracks = 0;
              } else {
                numVideoTracks = offerOptions.offerToReceiveVideo;
              }
            }
          }

          pc.transceivers.forEach(function (transceiver) {
            if (transceiver.kind === 'audio') {
              numAudioTracks--;
              if (numAudioTracks < 0) {
                transceiver.wantReceive = false;
              }
            } else if (transceiver.kind === 'video') {
              numVideoTracks--;
              if (numVideoTracks < 0) {
                transceiver.wantReceive = false;
              }
            }
          });

          // Create M-lines for recvonly streams.
          while (numAudioTracks > 0 || numVideoTracks > 0) {
            if (numAudioTracks > 0) {
              pc._createTransceiver('audio');
              numAudioTracks--;
            }
            if (numVideoTracks > 0) {
              pc._createTransceiver('video');
              numVideoTracks--;
            }
          }

          var sdp = SDPUtils.writeSessionBoilerplate(pc._sdpSessionId, pc._sdpSessionVersion++);
          pc.transceivers.forEach(function (transceiver, sdpMLineIndex) {
            // For each track, create an ice gatherer, ice transport,
            // dtls transport, potentially rtpsender and rtpreceiver.
            var track = transceiver.track;
            var kind = transceiver.kind;
            var mid = transceiver.mid || SDPUtils.generateIdentifier();
            transceiver.mid = mid;

            if (!transceiver.iceGatherer) {
              transceiver.iceGatherer = pc._createIceGatherer(sdpMLineIndex, pc.usingBundle);
            }

            var localCapabilities = window.RTCRtpSender.getCapabilities(kind);
            // filter RTX until additional stuff needed for RTX is implemented
            // in adapter.js
            if (edgeVersion < 15019) {
              localCapabilities.codecs = localCapabilities.codecs.filter(function (codec) {
                return codec.name !== 'rtx';
              });
            }
            localCapabilities.codecs.forEach(function (codec) {
              // work around https://bugs.chromium.org/p/webrtc/issues/detail?id=6552
              // by adding level-asymmetry-allowed=1
              if (codec.name === 'H264' && codec.parameters['level-asymmetry-allowed'] === undefined) {
                codec.parameters['level-asymmetry-allowed'] = '1';
              }

              // for subsequent offers, we might have to re-use the payload
              // type of the last offer.
              if (transceiver.remoteCapabilities && transceiver.remoteCapabilities.codecs) {
                transceiver.remoteCapabilities.codecs.forEach(function (remoteCodec) {
                  if (codec.name.toLowerCase() === remoteCodec.name.toLowerCase() && codec.clockRate === remoteCodec.clockRate) {
                    codec.preferredPayloadType = remoteCodec.payloadType;
                  }
                });
              }
            });
            localCapabilities.headerExtensions.forEach(function (hdrExt) {
              var remoteExtensions = transceiver.remoteCapabilities && transceiver.remoteCapabilities.headerExtensions || [];
              remoteExtensions.forEach(function (rHdrExt) {
                if (hdrExt.uri === rHdrExt.uri) {
                  hdrExt.id = rHdrExt.id;
                }
              });
            });

            // generate an ssrc now, to be used later in rtpSender.send
            var sendEncodingParameters = transceiver.sendEncodingParameters || [{
              ssrc: (2 * sdpMLineIndex + 1) * 1001
            }];
            if (track) {
              // add RTX
              if (edgeVersion >= 15019 && kind === 'video' && !sendEncodingParameters[0].rtx) {
                sendEncodingParameters[0].rtx = {
                  ssrc: sendEncodingParameters[0].ssrc + 1
                };
              }
            }

            if (transceiver.wantReceive) {
              transceiver.rtpReceiver = new window.RTCRtpReceiver(transceiver.dtlsTransport, kind);
            }

            transceiver.localCapabilities = localCapabilities;
            transceiver.sendEncodingParameters = sendEncodingParameters;
          });

          // always offer BUNDLE and dispose on return if not supported.
          if (pc._config.bundlePolicy !== 'max-compat') {
            sdp += 'a=group:BUNDLE ' + pc.transceivers.map(function (t) {
              return t.mid;
            }).join(' ') + '\r\n';
          }
          sdp += 'a=ice-options:trickle\r\n';

          pc.transceivers.forEach(function (transceiver, sdpMLineIndex) {
            sdp += writeMediaSection(transceiver, transceiver.localCapabilities, 'offer', transceiver.stream, pc._dtlsRole);
            sdp += 'a=rtcp-rsize\r\n';

            if (transceiver.iceGatherer && pc.iceGatheringState !== 'new' && (sdpMLineIndex === 0 || !pc.usingBundle)) {
              transceiver.iceGatherer.getLocalCandidates().forEach(function (cand) {
                cand.component = 1;
                sdp += 'a=' + SDPUtils.writeCandidate(cand) + '\r\n';
              });

              if (transceiver.iceGatherer.state === 'completed') {
                sdp += 'a=end-of-candidates\r\n';
              }
            }
          });

          var desc = new window.RTCSessionDescription({
            type: 'offer',
            sdp: sdp
          });
          return Promise.resolve(desc);
        };

        RTCPeerConnection.prototype.createAnswer = function () {
          var pc = this;

          if (pc._isClosed) {
            return Promise.reject(makeError('InvalidStateError', 'Can not call createAnswer after close'));
          }

          if (!(pc.signalingState === 'have-remote-offer' || pc.signalingState === 'have-local-pranswer')) {
            return Promise.reject(makeError('InvalidStateError', 'Can not call createAnswer in signalingState ' + pc.signalingState));
          }

          var sdp = SDPUtils.writeSessionBoilerplate(pc._sdpSessionId, pc._sdpSessionVersion++);
          if (pc.usingBundle) {
            sdp += 'a=group:BUNDLE ' + pc.transceivers.map(function (t) {
              return t.mid;
            }).join(' ') + '\r\n';
          }
          var mediaSectionsInOffer = SDPUtils.getMediaSections(pc.remoteDescription.sdp).length;
          pc.transceivers.forEach(function (transceiver, sdpMLineIndex) {
            if (sdpMLineIndex + 1 > mediaSectionsInOffer) {
              return;
            }
            if (transceiver.rejected) {
              if (transceiver.kind === 'application') {
                sdp += 'm=application 0 DTLS/SCTP 5000\r\n';
              } else if (transceiver.kind === 'audio') {
                sdp += 'm=audio 0 UDP/TLS/RTP/SAVPF 0\r\n' + 'a=rtpmap:0 PCMU/8000\r\n';
              } else if (transceiver.kind === 'video') {
                sdp += 'm=video 0 UDP/TLS/RTP/SAVPF 120\r\n' + 'a=rtpmap:120 VP8/90000\r\n';
              }
              sdp += 'c=IN IP4 0.0.0.0\r\n' + 'a=inactive\r\n' + 'a=mid:' + transceiver.mid + '\r\n';
              return;
            }

            // FIXME: look at direction.
            if (transceiver.stream) {
              var localTrack;
              if (transceiver.kind === 'audio') {
                localTrack = transceiver.stream.getAudioTracks()[0];
              } else if (transceiver.kind === 'video') {
                localTrack = transceiver.stream.getVideoTracks()[0];
              }
              if (localTrack) {
                // add RTX
                if (edgeVersion >= 15019 && transceiver.kind === 'video' && !transceiver.sendEncodingParameters[0].rtx) {
                  transceiver.sendEncodingParameters[0].rtx = {
                    ssrc: transceiver.sendEncodingParameters[0].ssrc + 1
                  };
                }
              }
            }

            // Calculate intersection of capabilities.
            var commonCapabilities = getCommonCapabilities(transceiver.localCapabilities, transceiver.remoteCapabilities);

            var hasRtx = commonCapabilities.codecs.filter(function (c) {
              return c.name.toLowerCase() === 'rtx';
            }).length;
            if (!hasRtx && transceiver.sendEncodingParameters[0].rtx) {
              delete transceiver.sendEncodingParameters[0].rtx;
            }

            sdp += writeMediaSection(transceiver, commonCapabilities, 'answer', transceiver.stream, pc._dtlsRole);
            if (transceiver.rtcpParameters && transceiver.rtcpParameters.reducedSize) {
              sdp += 'a=rtcp-rsize\r\n';
            }
          });

          var desc = new window.RTCSessionDescription({
            type: 'answer',
            sdp: sdp
          });
          return Promise.resolve(desc);
        };

        RTCPeerConnection.prototype.addIceCandidate = function (candidate) {
          var pc = this;
          var sections;
          if (candidate && !(candidate.sdpMLineIndex !== undefined || candidate.sdpMid)) {
            return Promise.reject(new TypeError('sdpMLineIndex or sdpMid required'));
          }

          // TODO: needs to go into ops queue.
          return new Promise(function (resolve, reject) {
            if (!pc.remoteDescription) {
              return reject(makeError('InvalidStateError', 'Can not add ICE candidate without a remote description'));
            } else if (!candidate || candidate.candidate === '') {
              for (var j = 0; j < pc.transceivers.length; j++) {
                if (pc.transceivers[j].rejected) {
                  continue;
                }
                pc.transceivers[j].iceTransport.addRemoteCandidate({});
                sections = SDPUtils.getMediaSections(pc.remoteDescription.sdp);
                sections[j] += 'a=end-of-candidates\r\n';
                pc.remoteDescription.sdp = SDPUtils.getDescription(pc.remoteDescription.sdp) + sections.join('');
                if (pc.usingBundle) {
                  break;
                }
              }
            } else {
              var sdpMLineIndex = candidate.sdpMLineIndex;
              if (candidate.sdpMid) {
                for (var i = 0; i < pc.transceivers.length; i++) {
                  if (pc.transceivers[i].mid === candidate.sdpMid) {
                    sdpMLineIndex = i;
                    break;
                  }
                }
              }
              var transceiver = pc.transceivers[sdpMLineIndex];
              if (transceiver) {
                if (transceiver.rejected) {
                  return resolve();
                }
                var cand = Object.keys(candidate.candidate).length > 0 ? SDPUtils.parseCandidate(candidate.candidate) : {};
                // Ignore Chrome's invalid candidates since Edge does not like them.
                if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
                  return resolve();
                }
                // Ignore RTCP candidates, we assume RTCP-MUX.
                if (cand.component && cand.component !== 1) {
                  return resolve();
                }
                // when using bundle, avoid adding candidates to the wrong
                // ice transport. And avoid adding candidates added in the SDP.
                if (sdpMLineIndex === 0 || sdpMLineIndex > 0 && transceiver.iceTransport !== pc.transceivers[0].iceTransport) {
                  if (!maybeAddCandidate(transceiver.iceTransport, cand)) {
                    return reject(makeError('OperationError', 'Can not add ICE candidate'));
                  }
                }

                // update the remoteDescription.
                var candidateString = candidate.candidate.trim();
                if (candidateString.indexOf('a=') === 0) {
                  candidateString = candidateString.substr(2);
                }
                sections = SDPUtils.getMediaSections(pc.remoteDescription.sdp);
                sections[sdpMLineIndex] += 'a=' + (cand.type ? candidateString : 'end-of-candidates') + '\r\n';
                pc.remoteDescription.sdp = SDPUtils.getDescription(pc.remoteDescription.sdp) + sections.join('');
              } else {
                return reject(makeError('OperationError', 'Can not add ICE candidate'));
              }
            }
            resolve();
          });
        };

        RTCPeerConnection.prototype.getStats = function () {
          var promises = [];
          this.transceivers.forEach(function (transceiver) {
            ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport', 'dtlsTransport'].forEach(function (method) {
              if (transceiver[method]) {
                promises.push(transceiver[method].getStats());
              }
            });
          });
          var fixStatsType = function fixStatsType(stat) {
            return {
              inboundrtp: 'inbound-rtp',
              outboundrtp: 'outbound-rtp',
              candidatepair: 'candidate-pair',
              localcandidate: 'local-candidate',
              remotecandidate: 'remote-candidate'
            }[stat.type] || stat.type;
          };
          return new Promise(function (resolve) {
            // shim getStats with maplike support
            var results = new Map();
            Promise.all(promises).then(function (res) {
              res.forEach(function (result) {
                Object.keys(result).forEach(function (id) {
                  result[id].type = fixStatsType(result[id]);
                  results.set(id, result[id]);
                });
              });
              resolve(results);
            });
          });
        };

        // legacy callback shims. Should be moved to adapter.js some days.
        var methods = ['createOffer', 'createAnswer'];
        methods.forEach(function (method) {
          var nativeMethod = RTCPeerConnection.prototype[method];
          RTCPeerConnection.prototype[method] = function () {
            var args = arguments;
            if (typeof args[0] === 'function' || typeof args[1] === 'function') {
              // legacy
              return nativeMethod.apply(this, [arguments[2]]).then(function (description) {
                if (typeof args[0] === 'function') {
                  args[0].apply(null, [description]);
                }
              }, function (error) {
                if (typeof args[1] === 'function') {
                  args[1].apply(null, [error]);
                }
              });
            }
            return nativeMethod.apply(this, arguments);
          };
        });

        methods = ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'];
        methods.forEach(function (method) {
          var nativeMethod = RTCPeerConnection.prototype[method];
          RTCPeerConnection.prototype[method] = function () {
            var args = arguments;
            if (typeof args[1] === 'function' || typeof args[2] === 'function') {
              // legacy
              return nativeMethod.apply(this, arguments).then(function () {
                if (typeof args[1] === 'function') {
                  args[1].apply(null);
                }
              }, function (error) {
                if (typeof args[2] === 'function') {
                  args[2].apply(null, [error]);
                }
              });
            }
            return nativeMethod.apply(this, arguments);
          };
        });

        // getStats is special. It doesn't have a spec legacy method yet we support
        // getStats(something, cb) without error callbacks.
        ['getStats'].forEach(function (method) {
          var nativeMethod = RTCPeerConnection.prototype[method];
          RTCPeerConnection.prototype[method] = function () {
            var args = arguments;
            if (typeof args[1] === 'function') {
              return nativeMethod.apply(this, arguments).then(function () {
                if (typeof args[1] === 'function') {
                  args[1].apply(null);
                }
              });
            }
            return nativeMethod.apply(this, arguments);
          };
        });

        return RTCPeerConnection;
      };
    }, { "sdp": 2 }], 2: [function (require, module, exports) {
      /* eslint-env node */
      'use strict';

      // SDP helpers.

      var SDPUtils = {};

      // Generate an alphanumeric identifier for cname or mids.
      // TODO: use UUIDs instead? https://gist.github.com/jed/982883
      SDPUtils.generateIdentifier = function () {
        return Math.random().toString(36).substr(2, 10);
      };

      // The RTCP CNAME used by all peerconnections from the same JS.
      SDPUtils.localCName = SDPUtils.generateIdentifier();

      // Splits SDP into lines, dealing with both CRLF and LF.
      SDPUtils.splitLines = function (blob) {
        return blob.trim().split('\n').map(function (line) {
          return line.trim();
        });
      };
      // Splits SDP into sessionpart and mediasections. Ensures CRLF.
      SDPUtils.splitSections = function (blob) {
        var parts = blob.split('\nm=');
        return parts.map(function (part, index) {
          return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
        });
      };

      // returns the session description.
      SDPUtils.getDescription = function (blob) {
        var sections = SDPUtils.splitSections(blob);
        return sections && sections[0];
      };

      // returns the individual media sections.
      SDPUtils.getMediaSections = function (blob) {
        var sections = SDPUtils.splitSections(blob);
        sections.shift();
        return sections;
      };

      // Returns lines that start with a certain prefix.
      SDPUtils.matchPrefix = function (blob, prefix) {
        return SDPUtils.splitLines(blob).filter(function (line) {
          return line.indexOf(prefix) === 0;
        });
      };

      // Parses an ICE candidate line. Sample input:
      // candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
      // rport 55996"
      SDPUtils.parseCandidate = function (line) {
        var parts;
        // Parse both variants.
        if (line.indexOf('a=candidate:') === 0) {
          parts = line.substring(12).split(' ');
        } else {
          parts = line.substring(10).split(' ');
        }

        var candidate = {
          foundation: parts[0],
          component: parseInt(parts[1], 10),
          protocol: parts[2].toLowerCase(),
          priority: parseInt(parts[3], 10),
          ip: parts[4],
          port: parseInt(parts[5], 10),
          // skip parts[6] == 'typ'
          type: parts[7]
        };

        for (var i = 8; i < parts.length; i += 2) {
          switch (parts[i]) {
            case 'raddr':
              candidate.relatedAddress = parts[i + 1];
              break;
            case 'rport':
              candidate.relatedPort = parseInt(parts[i + 1], 10);
              break;
            case 'tcptype':
              candidate.tcpType = parts[i + 1];
              break;
            case 'ufrag':
              candidate.ufrag = parts[i + 1]; // for backward compability.
              candidate.usernameFragment = parts[i + 1];
              break;
            default:
              // extension handling, in particular ufrag
              candidate[parts[i]] = parts[i + 1];
              break;
          }
        }
        return candidate;
      };

      // Translates a candidate object into SDP candidate attribute.
      SDPUtils.writeCandidate = function (candidate) {
        var sdp = [];
        sdp.push(candidate.foundation);
        sdp.push(candidate.component);
        sdp.push(candidate.protocol.toUpperCase());
        sdp.push(candidate.priority);
        sdp.push(candidate.ip);
        sdp.push(candidate.port);

        var type = candidate.type;
        sdp.push('typ');
        sdp.push(type);
        if (type !== 'host' && candidate.relatedAddress && candidate.relatedPort) {
          sdp.push('raddr');
          sdp.push(candidate.relatedAddress); // was: relAddr
          sdp.push('rport');
          sdp.push(candidate.relatedPort); // was: relPort
        }
        if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
          sdp.push('tcptype');
          sdp.push(candidate.tcpType);
        }
        if (candidate.usernameFragment || candidate.ufrag) {
          sdp.push('ufrag');
          sdp.push(candidate.usernameFragment || candidate.ufrag);
        }
        return 'candidate:' + sdp.join(' ');
      };

      // Parses an ice-options line, returns an array of option tags.
      // a=ice-options:foo bar
      SDPUtils.parseIceOptions = function (line) {
        return line.substr(14).split(' ');
      };

      // Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
      // a=rtpmap:111 opus/48000/2
      SDPUtils.parseRtpMap = function (line) {
        var parts = line.substr(9).split(' ');
        var parsed = {
          payloadType: parseInt(parts.shift(), 10) // was: id
        };

        parts = parts[0].split('/');

        parsed.name = parts[0];
        parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
        // was: channels
        parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
        return parsed;
      };

      // Generate an a=rtpmap line from RTCRtpCodecCapability or
      // RTCRtpCodecParameters.
      SDPUtils.writeRtpMap = function (codec) {
        var pt = codec.payloadType;
        if (codec.preferredPayloadType !== undefined) {
          pt = codec.preferredPayloadType;
        }
        return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate + (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
      };

      // Parses an a=extmap line (headerextension from RFC 5285). Sample input:
      // a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      // a=extmap:2/sendonly urn:ietf:params:rtp-hdrext:toffset
      SDPUtils.parseExtmap = function (line) {
        var parts = line.substr(9).split(' ');
        return {
          id: parseInt(parts[0], 10),
          direction: parts[0].indexOf('/') > 0 ? parts[0].split('/')[1] : 'sendrecv',
          uri: parts[1]
        };
      };

      // Generates a=extmap line from RTCRtpHeaderExtensionParameters or
      // RTCRtpHeaderExtension.
      SDPUtils.writeExtmap = function (headerExtension) {
        return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) + (headerExtension.direction && headerExtension.direction !== 'sendrecv' ? '/' + headerExtension.direction : '') + ' ' + headerExtension.uri + '\r\n';
      };

      // Parses an ftmp line, returns dictionary. Sample input:
      // a=fmtp:96 vbr=on;cng=on
      // Also deals with vbr=on; cng=on
      SDPUtils.parseFmtp = function (line) {
        var parsed = {};
        var kv;
        var parts = line.substr(line.indexOf(' ') + 1).split(';');
        for (var j = 0; j < parts.length; j++) {
          kv = parts[j].trim().split('=');
          parsed[kv[0].trim()] = kv[1];
        }
        return parsed;
      };

      // Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
      SDPUtils.writeFmtp = function (codec) {
        var line = '';
        var pt = codec.payloadType;
        if (codec.preferredPayloadType !== undefined) {
          pt = codec.preferredPayloadType;
        }
        if (codec.parameters && Object.keys(codec.parameters).length) {
          var params = [];
          Object.keys(codec.parameters).forEach(function (param) {
            params.push(param + '=' + codec.parameters[param]);
          });
          line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
        }
        return line;
      };

      // Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
      // a=rtcp-fb:98 nack rpsi
      SDPUtils.parseRtcpFb = function (line) {
        var parts = line.substr(line.indexOf(' ') + 1).split(' ');
        return {
          type: parts.shift(),
          parameter: parts.join(' ')
        };
      };
      // Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
      SDPUtils.writeRtcpFb = function (codec) {
        var lines = '';
        var pt = codec.payloadType;
        if (codec.preferredPayloadType !== undefined) {
          pt = codec.preferredPayloadType;
        }
        if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
          // FIXME: special handling for trr-int?
          codec.rtcpFeedback.forEach(function (fb) {
            lines += 'a=rtcp-fb:' + pt + ' ' + fb.type + (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') + '\r\n';
          });
        }
        return lines;
      };

      // Parses an RFC 5576 ssrc media attribute. Sample input:
      // a=ssrc:3735928559 cname:something
      SDPUtils.parseSsrcMedia = function (line) {
        var sp = line.indexOf(' ');
        var parts = {
          ssrc: parseInt(line.substr(7, sp - 7), 10)
        };
        var colon = line.indexOf(':', sp);
        if (colon > -1) {
          parts.attribute = line.substr(sp + 1, colon - sp - 1);
          parts.value = line.substr(colon + 1);
        } else {
          parts.attribute = line.substr(sp + 1);
        }
        return parts;
      };

      // Extracts the MID (RFC 5888) from a media section.
      // returns the MID or undefined if no mid line was found.
      SDPUtils.getMid = function (mediaSection) {
        var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:')[0];
        if (mid) {
          return mid.substr(6);
        }
      };

      SDPUtils.parseFingerprint = function (line) {
        var parts = line.substr(14).split(' ');
        return {
          algorithm: parts[0].toLowerCase(), // algorithm is case-sensitive in Edge.
          value: parts[1]
        };
      };

      // Extracts DTLS parameters from SDP media section or sessionpart.
      // FIXME: for consistency with other functions this should only
      //   get the fingerprint line as input. See also getIceParameters.
      SDPUtils.getDtlsParameters = function (mediaSection, sessionpart) {
        var lines = SDPUtils.matchPrefix(mediaSection + sessionpart, 'a=fingerprint:');
        // Note: a=setup line is ignored since we use the 'auto' role.
        // Note2: 'algorithm' is not case sensitive except in Edge.
        return {
          role: 'auto',
          fingerprints: lines.map(SDPUtils.parseFingerprint)
        };
      };

      // Serializes DTLS parameters to SDP.
      SDPUtils.writeDtlsParameters = function (params, setupType) {
        var sdp = 'a=setup:' + setupType + '\r\n';
        params.fingerprints.forEach(function (fp) {
          sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
        });
        return sdp;
      };
      // Parses ICE information from SDP media section or sessionpart.
      // FIXME: for consistency with other functions this should only
      //   get the ice-ufrag and ice-pwd lines as input.
      SDPUtils.getIceParameters = function (mediaSection, sessionpart) {
        var lines = SDPUtils.splitLines(mediaSection);
        // Search in session part, too.
        lines = lines.concat(SDPUtils.splitLines(sessionpart));
        var iceParameters = {
          usernameFragment: lines.filter(function (line) {
            return line.indexOf('a=ice-ufrag:') === 0;
          })[0].substr(12),
          password: lines.filter(function (line) {
            return line.indexOf('a=ice-pwd:') === 0;
          })[0].substr(10)
        };
        return iceParameters;
      };

      // Serializes ICE parameters to SDP.
      SDPUtils.writeIceParameters = function (params) {
        return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' + 'a=ice-pwd:' + params.password + '\r\n';
      };

      // Parses the SDP media section and returns RTCRtpParameters.
      SDPUtils.parseRtpParameters = function (mediaSection) {
        var description = {
          codecs: [],
          headerExtensions: [],
          fecMechanisms: [],
          rtcp: []
        };
        var lines = SDPUtils.splitLines(mediaSection);
        var mline = lines[0].split(' ');
        for (var i = 3; i < mline.length; i++) {
          // find all codecs from mline[3..]
          var pt = mline[i];
          var rtpmapline = SDPUtils.matchPrefix(mediaSection, 'a=rtpmap:' + pt + ' ')[0];
          if (rtpmapline) {
            var codec = SDPUtils.parseRtpMap(rtpmapline);
            var fmtps = SDPUtils.matchPrefix(mediaSection, 'a=fmtp:' + pt + ' ');
            // Only the first a=fmtp:<pt> is considered.
            codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
            codec.rtcpFeedback = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-fb:' + pt + ' ').map(SDPUtils.parseRtcpFb);
            description.codecs.push(codec);
            // parse FEC mechanisms from rtpmap lines.
            switch (codec.name.toUpperCase()) {
              case 'RED':
              case 'ULPFEC':
                description.fecMechanisms.push(codec.name.toUpperCase());
                break;
              default:
                // only RED and ULPFEC are recognized as FEC mechanisms.
                break;
            }
          }
        }
        SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function (line) {
          description.headerExtensions.push(SDPUtils.parseExtmap(line));
        });
        // FIXME: parse rtcp.
        return description;
      };

      // Generates parts of the SDP media section describing the capabilities /
      // parameters.
      SDPUtils.writeRtpDescription = function (kind, caps) {
        var sdp = '';

        // Build the mline.
        sdp += 'm=' + kind + ' ';
        sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
        sdp += ' UDP/TLS/RTP/SAVPF ';
        sdp += caps.codecs.map(function (codec) {
          if (codec.preferredPayloadType !== undefined) {
            return codec.preferredPayloadType;
          }
          return codec.payloadType;
        }).join(' ') + '\r\n';

        sdp += 'c=IN IP4 0.0.0.0\r\n';
        sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

        // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
        caps.codecs.forEach(function (codec) {
          sdp += SDPUtils.writeRtpMap(codec);
          sdp += SDPUtils.writeFmtp(codec);
          sdp += SDPUtils.writeRtcpFb(codec);
        });
        var maxptime = 0;
        caps.codecs.forEach(function (codec) {
          if (codec.maxptime > maxptime) {
            maxptime = codec.maxptime;
          }
        });
        if (maxptime > 0) {
          sdp += 'a=maxptime:' + maxptime + '\r\n';
        }
        sdp += 'a=rtcp-mux\r\n';

        caps.headerExtensions.forEach(function (extension) {
          sdp += SDPUtils.writeExtmap(extension);
        });
        // FIXME: write fecMechanisms.
        return sdp;
      };

      // Parses the SDP media section and returns an array of
      // RTCRtpEncodingParameters.
      SDPUtils.parseRtpEncodingParameters = function (mediaSection) {
        var encodingParameters = [];
        var description = SDPUtils.parseRtpParameters(mediaSection);
        var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
        var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

        // filter a=ssrc:... cname:, ignore PlanB-msid
        var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:').map(function (line) {
          return SDPUtils.parseSsrcMedia(line);
        }).filter(function (parts) {
          return parts.attribute === 'cname';
        });
        var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
        var secondarySsrc;

        var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID').map(function (line) {
          var parts = line.split(' ');
          parts.shift();
          return parts.map(function (part) {
            return parseInt(part, 10);
          });
        });
        if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
          secondarySsrc = flows[0][1];
        }

        description.codecs.forEach(function (codec) {
          if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
            var encParam = {
              ssrc: primarySsrc,
              codecPayloadType: parseInt(codec.parameters.apt, 10),
              rtx: {
                ssrc: secondarySsrc
              }
            };
            encodingParameters.push(encParam);
            if (hasRed) {
              encParam = JSON.parse(JSON.stringify(encParam));
              encParam.fec = {
                ssrc: secondarySsrc,
                mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
              };
              encodingParameters.push(encParam);
            }
          }
        });
        if (encodingParameters.length === 0 && primarySsrc) {
          encodingParameters.push({
            ssrc: primarySsrc
          });
        }

        // we support both b=AS and b=TIAS but interpret AS as TIAS.
        var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
        if (bandwidth.length) {
          if (bandwidth[0].indexOf('b=TIAS:') === 0) {
            bandwidth = parseInt(bandwidth[0].substr(7), 10);
          } else if (bandwidth[0].indexOf('b=AS:') === 0) {
            // use formula from JSEP to convert b=AS to TIAS value.
            bandwidth = parseInt(bandwidth[0].substr(5), 10) * 1000 * 0.95 - 50 * 40 * 8;
          } else {
            bandwidth = undefined;
          }
          encodingParameters.forEach(function (params) {
            params.maxBitrate = bandwidth;
          });
        }
        return encodingParameters;
      };

      // parses http://draft.ortc.org/#rtcrtcpparameters*
      SDPUtils.parseRtcpParameters = function (mediaSection) {
        var rtcpParameters = {};

        var cname;
        // Gets the first SSRC. Note that with RTX there might be multiple
        // SSRCs.
        var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:').map(function (line) {
          return SDPUtils.parseSsrcMedia(line);
        }).filter(function (obj) {
          return obj.attribute === 'cname';
        })[0];
        if (remoteSsrc) {
          rtcpParameters.cname = remoteSsrc.value;
          rtcpParameters.ssrc = remoteSsrc.ssrc;
        }

        // Edge uses the compound attribute instead of reducedSize
        // compound is !reducedSize
        var rsize = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-rsize');
        rtcpParameters.reducedSize = rsize.length > 0;
        rtcpParameters.compound = rsize.length === 0;

        // parses the rtcp-mux attrіbute.
        // Note that Edge does not support unmuxed RTCP.
        var mux = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-mux');
        rtcpParameters.mux = mux.length > 0;

        return rtcpParameters;
      };

      // parses either a=msid: or a=ssrc:... msid lines and returns
      // the id of the MediaStream and MediaStreamTrack.
      SDPUtils.parseMsid = function (mediaSection) {
        var parts;
        var spec = SDPUtils.matchPrefix(mediaSection, 'a=msid:');
        if (spec.length === 1) {
          parts = spec[0].substr(7).split(' ');
          return { stream: parts[0], track: parts[1] };
        }
        var planB = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:').map(function (line) {
          return SDPUtils.parseSsrcMedia(line);
        }).filter(function (parts) {
          return parts.attribute === 'msid';
        });
        if (planB.length > 0) {
          parts = planB[0].value.split(' ');
          return { stream: parts[0], track: parts[1] };
        }
      };

      // Generate a session ID for SDP.
      // https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-20#section-5.2.1
      // recommends using a cryptographically random +ve 64-bit value
      // but right now this should be acceptable and within the right range
      SDPUtils.generateSessionId = function () {
        return Math.random().toString().substr(2, 21);
      };

      // Write boilder plate for start of SDP
      // sessId argument is optional - if not supplied it will
      // be generated randomly
      // sessVersion is optional and defaults to 2
      SDPUtils.writeSessionBoilerplate = function (sessId, sessVer) {
        var sessionId;
        var version = sessVer !== undefined ? sessVer : 2;
        if (sessId) {
          sessionId = sessId;
        } else {
          sessionId = SDPUtils.generateSessionId();
        }
        // FIXME: sess-id should be an NTP timestamp.
        return 'v=0\r\n' + 'o=thisisadapterortc ' + sessionId + ' ' + version + ' IN IP4 127.0.0.1\r\n' + 's=-\r\n' + 't=0 0\r\n';
      };

      SDPUtils.writeMediaSection = function (transceiver, caps, type, stream) {
        var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

        // Map ICE parameters (ufrag, pwd) to SDP.
        sdp += SDPUtils.writeIceParameters(transceiver.iceGatherer.getLocalParameters());

        // Map DTLS parameters to SDP.
        sdp += SDPUtils.writeDtlsParameters(transceiver.dtlsTransport.getLocalParameters(), type === 'offer' ? 'actpass' : 'active');

        sdp += 'a=mid:' + transceiver.mid + '\r\n';

        if (transceiver.direction) {
          sdp += 'a=' + transceiver.direction + '\r\n';
        } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
          sdp += 'a=sendrecv\r\n';
        } else if (transceiver.rtpSender) {
          sdp += 'a=sendonly\r\n';
        } else if (transceiver.rtpReceiver) {
          sdp += 'a=recvonly\r\n';
        } else {
          sdp += 'a=inactive\r\n';
        }

        if (transceiver.rtpSender) {
          // spec.
          var msid = 'msid:' + stream.id + ' ' + transceiver.rtpSender.track.id + '\r\n';
          sdp += 'a=' + msid;

          // for Chrome.
          sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc + ' ' + msid;
          if (transceiver.sendEncodingParameters[0].rtx) {
            sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc + ' ' + msid;
            sdp += 'a=ssrc-group:FID ' + transceiver.sendEncodingParameters[0].ssrc + ' ' + transceiver.sendEncodingParameters[0].rtx.ssrc + '\r\n';
          }
        }
        // FIXME: this should be written by writeRtpDescription.
        sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc + ' cname:' + SDPUtils.localCName + '\r\n';
        if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
          sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc + ' cname:' + SDPUtils.localCName + '\r\n';
        }
        return sdp;
      };

      // Gets the direction from the mediaSection or the sessionpart.
      SDPUtils.getDirection = function (mediaSection, sessionpart) {
        // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
        var lines = SDPUtils.splitLines(mediaSection);
        for (var i = 0; i < lines.length; i++) {
          switch (lines[i]) {
            case 'a=sendrecv':
            case 'a=sendonly':
            case 'a=recvonly':
            case 'a=inactive':
              return lines[i].substr(2);
            default:
            // FIXME: What should happen here?
          }
        }
        if (sessionpart) {
          return SDPUtils.getDirection(sessionpart);
        }
        return 'sendrecv';
      };

      SDPUtils.getKind = function (mediaSection) {
        var lines = SDPUtils.splitLines(mediaSection);
        var mline = lines[0].split(' ');
        return mline[0].substr(2);
      };

      SDPUtils.isRejected = function (mediaSection) {
        return mediaSection.split(' ', 2)[1] === '0';
      };

      SDPUtils.parseMLine = function (mediaSection) {
        var lines = SDPUtils.splitLines(mediaSection);
        var parts = lines[0].substr(2).split(' ');
        return {
          kind: parts[0],
          port: parseInt(parts[1], 10),
          protocol: parts[2],
          fmt: parts.slice(3).join(' ')
        };
      };

      SDPUtils.parseOLine = function (mediaSection) {
        var line = SDPUtils.matchPrefix(mediaSection, 'o=')[0];
        var parts = line.substr(2).split(' ');
        return {
          username: parts[0],
          sessionId: parts[1],
          sessionVersion: parseInt(parts[2], 10),
          netType: parts[3],
          addressType: parts[4],
          address: parts[5]
        };
      };

      // Expose public methods.
      if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object') {
        module.exports = SDPUtils;
      }
    }, {}], 3: [function (require, module, exports) {
      (function (global) {
        /*
         *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
         *
         *  Use of this source code is governed by a BSD-style license
         *  that can be found in the LICENSE file in the root of the source
         *  tree.
         */
        /* eslint-env node */

        'use strict';

        var adapterFactory = require('./adapter_factory.js');
        module.exports = adapterFactory({ window: global.window });
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "./adapter_factory.js": 4 }], 4: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */

      'use strict';

      var utils = require('./utils');
      // Shimming starts here.
      module.exports = function (dependencies, opts) {
        var window = dependencies && dependencies.window;

        var options = {
          shimChrome: true,
          shimFirefox: true,
          shimEdge: true,
          shimSafari: true
        };

        for (var key in opts) {
          if (hasOwnProperty.call(opts, key)) {
            options[key] = opts[key];
          }
        }

        // Utils.
        var logging = utils.log;
        var browserDetails = utils.detectBrowser(window);

        // Uncomment the line below if you want logging to occur, including logging
        // for the switch statement below. Can also be turned on in the browser via
        // adapter.disableLog(false), but then logging from the switch statement below
        // will not appear.
        // require('./utils').disableLog(false);

        // Browser shims.
        var chromeShim = require('./chrome/chrome_shim') || null;
        var edgeShim = require('./edge/edge_shim') || null;
        var firefoxShim = require('./firefox/firefox_shim') || null;
        var safariShim = require('./safari/safari_shim') || null;
        var commonShim = require('./common_shim') || null;

        // Export to the adapter global object visible in the browser.
        var adapter = {
          browserDetails: browserDetails,
          commonShim: commonShim,
          extractVersion: utils.extractVersion,
          disableLog: utils.disableLog,
          disableWarnings: utils.disableWarnings
        };

        // Shim browser if found.
        switch (browserDetails.browser) {
          case 'chrome':
            if (!chromeShim || !chromeShim.shimPeerConnection || !options.shimChrome) {
              logging('Chrome shim is not included in this adapter release.');
              return adapter;
            }
            logging('adapter.js shimming chrome.');
            // Export to the adapter global object visible in the browser.
            adapter.browserShim = chromeShim;
            commonShim.shimCreateObjectURL(window);

            chromeShim.shimGetUserMedia(window);
            chromeShim.shimMediaStream(window);
            chromeShim.shimSourceObject(window);
            chromeShim.shimPeerConnection(window);
            chromeShim.shimOnTrack(window);
            chromeShim.shimAddTrackRemoveTrack(window);
            chromeShim.shimGetSendersWithDtmf(window);

            commonShim.shimRTCIceCandidate(window);
            commonShim.shimMaxMessageSize(window);
            commonShim.shimSendThrowTypeError(window);
            break;
          case 'firefox':
            if (!firefoxShim || !firefoxShim.shimPeerConnection || !options.shimFirefox) {
              logging('Firefox shim is not included in this adapter release.');
              return adapter;
            }
            logging('adapter.js shimming firefox.');
            // Export to the adapter global object visible in the browser.
            adapter.browserShim = firefoxShim;
            commonShim.shimCreateObjectURL(window);

            firefoxShim.shimGetUserMedia(window);
            firefoxShim.shimSourceObject(window);
            firefoxShim.shimPeerConnection(window);
            firefoxShim.shimOnTrack(window);
            firefoxShim.shimRemoveStream(window);

            commonShim.shimRTCIceCandidate(window);
            commonShim.shimMaxMessageSize(window);
            commonShim.shimSendThrowTypeError(window);
            break;
          case 'edge':
            if (!edgeShim || !edgeShim.shimPeerConnection || !options.shimEdge) {
              logging('MS edge shim is not included in this adapter release.');
              return adapter;
            }
            logging('adapter.js shimming edge.');
            // Export to the adapter global object visible in the browser.
            adapter.browserShim = edgeShim;
            commonShim.shimCreateObjectURL(window);

            edgeShim.shimGetUserMedia(window);
            edgeShim.shimPeerConnection(window);
            edgeShim.shimReplaceTrack(window);

            // the edge shim implements the full RTCIceCandidate object.

            commonShim.shimMaxMessageSize(window);
            commonShim.shimSendThrowTypeError(window);
            break;
          case 'safari':
            if (!safariShim || !options.shimSafari) {
              logging('Safari shim is not included in this adapter release.');
              return adapter;
            }
            logging('adapter.js shimming safari.');
            // Export to the adapter global object visible in the browser.
            adapter.browserShim = safariShim;
            commonShim.shimCreateObjectURL(window);

            safariShim.shimRTCIceServerUrls(window);
            safariShim.shimCallbacksAPI(window);
            safariShim.shimLocalStreamsAPI(window);
            safariShim.shimRemoteStreamsAPI(window);
            safariShim.shimTrackEventTransceiver(window);
            safariShim.shimGetUserMedia(window);
            safariShim.shimCreateOfferLegacy(window);

            commonShim.shimRTCIceCandidate(window);
            commonShim.shimMaxMessageSize(window);
            commonShim.shimSendThrowTypeError(window);
            break;
          default:
            logging('Unsupported browser!');
            break;
        }

        return adapter;
      };
    }, { "./chrome/chrome_shim": 5, "./common_shim": 7, "./edge/edge_shim": 8, "./firefox/firefox_shim": 10, "./safari/safari_shim": 12, "./utils": 13 }], 5: [function (require, module, exports) {

      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var utils = require('../utils.js');
      var logging = utils.log;

      module.exports = {
        shimGetUserMedia: require('./getusermedia'),
        shimMediaStream: function shimMediaStream(window) {
          window.MediaStream = window.MediaStream || window.webkitMediaStream;
        },

        shimOnTrack: function shimOnTrack(window) {
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.RTCPeerConnection && !('ontrack' in window.RTCPeerConnection.prototype)) {
            Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
              get: function get() {
                return this._ontrack;
              },
              set: function set(f) {
                if (this._ontrack) {
                  this.removeEventListener('track', this._ontrack);
                }
                this.addEventListener('track', this._ontrack = f);
              }
            });
            var origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
            window.RTCPeerConnection.prototype.setRemoteDescription = function () {
              var pc = this;
              if (!pc._ontrackpoly) {
                pc._ontrackpoly = function (e) {
                  // onaddstream does not fire when a track is added to an existing
                  // stream. But stream.onaddtrack is implemented so we use that.
                  e.stream.addEventListener('addtrack', function (te) {
                    var receiver;
                    if (window.RTCPeerConnection.prototype.getReceivers) {
                      receiver = pc.getReceivers().find(function (r) {
                        return r.track && r.track.id === te.track.id;
                      });
                    } else {
                      receiver = { track: te.track };
                    }

                    var event = new Event('track');
                    event.track = te.track;
                    event.receiver = receiver;
                    event.transceiver = { receiver: receiver };
                    event.streams = [e.stream];
                    pc.dispatchEvent(event);
                  });
                  e.stream.getTracks().forEach(function (track) {
                    var receiver;
                    if (window.RTCPeerConnection.prototype.getReceivers) {
                      receiver = pc.getReceivers().find(function (r) {
                        return r.track && r.track.id === track.id;
                      });
                    } else {
                      receiver = { track: track };
                    }
                    var event = new Event('track');
                    event.track = track;
                    event.receiver = receiver;
                    event.transceiver = { receiver: receiver };
                    event.streams = [e.stream];
                    pc.dispatchEvent(event);
                  });
                };
                pc.addEventListener('addstream', pc._ontrackpoly);
              }
              return origSetRemoteDescription.apply(pc, arguments);
            };
          } else if (!('RTCRtpTransceiver' in window)) {
            utils.wrapPeerConnectionEvent(window, 'track', function (e) {
              if (!e.transceiver) {
                e.transceiver = { receiver: e.receiver };
              }
              return e;
            });
          }
        },

        shimGetSendersWithDtmf: function shimGetSendersWithDtmf(window) {
          // Overrides addTrack/removeTrack, depends on shimAddTrackRemoveTrack.
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.RTCPeerConnection && !('getSenders' in window.RTCPeerConnection.prototype) && 'createDTMFSender' in window.RTCPeerConnection.prototype) {
            var shimSenderWithDtmf = function shimSenderWithDtmf(pc, track) {
              return {
                track: track,
                get dtmf() {
                  if (this._dtmf === undefined) {
                    if (track.kind === 'audio') {
                      this._dtmf = pc.createDTMFSender(track);
                    } else {
                      this._dtmf = null;
                    }
                  }
                  return this._dtmf;
                },
                _pc: pc
              };
            };

            // augment addTrack when getSenders is not available.
            if (!window.RTCPeerConnection.prototype.getSenders) {
              window.RTCPeerConnection.prototype.getSenders = function () {
                this._senders = this._senders || [];
                return this._senders.slice(); // return a copy of the internal state.
              };
              var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
              window.RTCPeerConnection.prototype.addTrack = function (track, stream) {
                var pc = this;
                var sender = origAddTrack.apply(pc, arguments);
                if (!sender) {
                  sender = shimSenderWithDtmf(pc, track);
                  pc._senders.push(sender);
                }
                return sender;
              };

              var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
              window.RTCPeerConnection.prototype.removeTrack = function (sender) {
                var pc = this;
                origRemoveTrack.apply(pc, arguments);
                var idx = pc._senders.indexOf(sender);
                if (idx !== -1) {
                  pc._senders.splice(idx, 1);
                }
              };
            }
            var origAddStream = window.RTCPeerConnection.prototype.addStream;
            window.RTCPeerConnection.prototype.addStream = function (stream) {
              var pc = this;
              pc._senders = pc._senders || [];
              origAddStream.apply(pc, [stream]);
              stream.getTracks().forEach(function (track) {
                pc._senders.push(shimSenderWithDtmf(pc, track));
              });
            };

            var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
            window.RTCPeerConnection.prototype.removeStream = function (stream) {
              var pc = this;
              pc._senders = pc._senders || [];
              origRemoveStream.apply(pc, [stream]);

              stream.getTracks().forEach(function (track) {
                var sender = pc._senders.find(function (s) {
                  return s.track === track;
                });
                if (sender) {
                  pc._senders.splice(pc._senders.indexOf(sender), 1); // remove sender
                }
              });
            };
          } else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.RTCPeerConnection && 'getSenders' in window.RTCPeerConnection.prototype && 'createDTMFSender' in window.RTCPeerConnection.prototype && window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
            var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
            window.RTCPeerConnection.prototype.getSenders = function () {
              var pc = this;
              var senders = origGetSenders.apply(pc, []);
              senders.forEach(function (sender) {
                sender._pc = pc;
              });
              return senders;
            };

            Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
              get: function get() {
                if (this._dtmf === undefined) {
                  if (this.track.kind === 'audio') {
                    this._dtmf = this._pc.createDTMFSender(this.track);
                  } else {
                    this._dtmf = null;
                  }
                }
                return this._dtmf;
              }
            });
          }
        },

        shimSourceObject: function shimSourceObject(window) {
          var URL = window && window.URL;

          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object') {
            if (window.HTMLMediaElement && !('srcObject' in window.HTMLMediaElement.prototype)) {
              // Shim the srcObject property, once, when HTMLMediaElement is found.
              Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
                get: function get() {
                  return this._srcObject;
                },
                set: function set(stream) {
                  var self = this;
                  // Use _srcObject as a private property for this shim
                  this._srcObject = stream;
                  if (this.src) {
                    URL.revokeObjectURL(this.src);
                  }

                  if (!stream) {
                    this.src = '';
                    return undefined;
                  }
                  this.src = URL.createObjectURL(stream);
                  // We need to recreate the blob url when a track is added or
                  // removed. Doing it manually since we want to avoid a recursion.
                  stream.addEventListener('addtrack', function () {
                    if (self.src) {
                      URL.revokeObjectURL(self.src);
                    }
                    self.src = URL.createObjectURL(stream);
                  });
                  stream.addEventListener('removetrack', function () {
                    if (self.src) {
                      URL.revokeObjectURL(self.src);
                    }
                    self.src = URL.createObjectURL(stream);
                  });
                }
              });
            }
          }
        },

        shimAddTrackRemoveTrackWithNative: function shimAddTrackRemoveTrackWithNative(window) {
          // shim addTrack/removeTrack with native variants in order to make
          // the interactions with legacy getLocalStreams behave as in other browsers.
          // Keeps a mapping stream.id => [stream, rtpsenders...]
          window.RTCPeerConnection.prototype.getLocalStreams = function () {
            var pc = this;
            this._shimmedLocalStreams = this._shimmedLocalStreams || {};
            return Object.keys(this._shimmedLocalStreams).map(function (streamId) {
              return pc._shimmedLocalStreams[streamId][0];
            });
          };

          var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
          window.RTCPeerConnection.prototype.addTrack = function (track, stream) {
            if (!stream) {
              return origAddTrack.apply(this, arguments);
            }
            this._shimmedLocalStreams = this._shimmedLocalStreams || {};

            var sender = origAddTrack.apply(this, arguments);
            if (!this._shimmedLocalStreams[stream.id]) {
              this._shimmedLocalStreams[stream.id] = [stream, sender];
            } else if (this._shimmedLocalStreams[stream.id].indexOf(sender) === -1) {
              this._shimmedLocalStreams[stream.id].push(sender);
            }
            return sender;
          };

          var origAddStream = window.RTCPeerConnection.prototype.addStream;
          window.RTCPeerConnection.prototype.addStream = function (stream) {
            var pc = this;
            this._shimmedLocalStreams = this._shimmedLocalStreams || {};

            stream.getTracks().forEach(function (track) {
              var alreadyExists = pc.getSenders().find(function (s) {
                return s.track === track;
              });
              if (alreadyExists) {
                throw new DOMException('Track already exists.', 'InvalidAccessError');
              }
            });
            var existingSenders = pc.getSenders();
            origAddStream.apply(this, arguments);
            var newSenders = pc.getSenders().filter(function (newSender) {
              return existingSenders.indexOf(newSender) === -1;
            });
            this._shimmedLocalStreams[stream.id] = [stream].concat(newSenders);
          };

          var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
          window.RTCPeerConnection.prototype.removeStream = function (stream) {
            this._shimmedLocalStreams = this._shimmedLocalStreams || {};
            delete this._shimmedLocalStreams[stream.id];
            return origRemoveStream.apply(this, arguments);
          };

          var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
          window.RTCPeerConnection.prototype.removeTrack = function (sender) {
            var pc = this;
            this._shimmedLocalStreams = this._shimmedLocalStreams || {};
            if (sender) {
              Object.keys(this._shimmedLocalStreams).forEach(function (streamId) {
                var idx = pc._shimmedLocalStreams[streamId].indexOf(sender);
                if (idx !== -1) {
                  pc._shimmedLocalStreams[streamId].splice(idx, 1);
                }
                if (pc._shimmedLocalStreams[streamId].length === 1) {
                  delete pc._shimmedLocalStreams[streamId];
                }
              });
            }
            return origRemoveTrack.apply(this, arguments);
          };
        },

        shimAddTrackRemoveTrack: function shimAddTrackRemoveTrack(window) {
          var browserDetails = utils.detectBrowser(window);
          // shim addTrack and removeTrack.
          if (window.RTCPeerConnection.prototype.addTrack && browserDetails.version >= 65) {
            return this.shimAddTrackRemoveTrackWithNative(window);
          }

          // also shim pc.getLocalStreams when addTrack is shimmed
          // to return the original streams.
          var origGetLocalStreams = window.RTCPeerConnection.prototype.getLocalStreams;
          window.RTCPeerConnection.prototype.getLocalStreams = function () {
            var pc = this;
            var nativeStreams = origGetLocalStreams.apply(this);
            pc._reverseStreams = pc._reverseStreams || {};
            return nativeStreams.map(function (stream) {
              return pc._reverseStreams[stream.id];
            });
          };

          var origAddStream = window.RTCPeerConnection.prototype.addStream;
          window.RTCPeerConnection.prototype.addStream = function (stream) {
            var pc = this;
            pc._streams = pc._streams || {};
            pc._reverseStreams = pc._reverseStreams || {};

            stream.getTracks().forEach(function (track) {
              var alreadyExists = pc.getSenders().find(function (s) {
                return s.track === track;
              });
              if (alreadyExists) {
                throw new DOMException('Track already exists.', 'InvalidAccessError');
              }
            });
            // Add identity mapping for consistency with addTrack.
            // Unless this is being used with a stream from addTrack.
            if (!pc._reverseStreams[stream.id]) {
              var newStream = new window.MediaStream(stream.getTracks());
              pc._streams[stream.id] = newStream;
              pc._reverseStreams[newStream.id] = stream;
              stream = newStream;
            }
            origAddStream.apply(pc, [stream]);
          };

          var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
          window.RTCPeerConnection.prototype.removeStream = function (stream) {
            var pc = this;
            pc._streams = pc._streams || {};
            pc._reverseStreams = pc._reverseStreams || {};

            origRemoveStream.apply(pc, [pc._streams[stream.id] || stream]);
            delete pc._reverseStreams[pc._streams[stream.id] ? pc._streams[stream.id].id : stream.id];
            delete pc._streams[stream.id];
          };

          window.RTCPeerConnection.prototype.addTrack = function (track, stream) {
            var pc = this;
            if (pc.signalingState === 'closed') {
              throw new DOMException('The RTCPeerConnection\'s signalingState is \'closed\'.', 'InvalidStateError');
            }
            var streams = [].slice.call(arguments, 1);
            if (streams.length !== 1 || !streams[0].getTracks().find(function (t) {
              return t === track;
            })) {
              // this is not fully correct but all we can manage without
              // [[associated MediaStreams]] internal slot.
              throw new DOMException('The adapter.js addTrack polyfill only supports a single ' + ' stream which is associated with the specified track.', 'NotSupportedError');
            }

            var alreadyExists = pc.getSenders().find(function (s) {
              return s.track === track;
            });
            if (alreadyExists) {
              throw new DOMException('Track already exists.', 'InvalidAccessError');
            }

            pc._streams = pc._streams || {};
            pc._reverseStreams = pc._reverseStreams || {};
            var oldStream = pc._streams[stream.id];
            if (oldStream) {
              // this is using odd Chrome behaviour, use with caution:
              // https://bugs.chromium.org/p/webrtc/issues/detail?id=7815
              // Note: we rely on the high-level addTrack/dtmf shim to
              // create the sender with a dtmf sender.
              oldStream.addTrack(track);

              // Trigger ONN async.
              Promise.resolve().then(function () {
                pc.dispatchEvent(new Event('negotiationneeded'));
              });
            } else {
              var newStream = new window.MediaStream([track]);
              pc._streams[stream.id] = newStream;
              pc._reverseStreams[newStream.id] = stream;
              pc.addStream(newStream);
            }
            return pc.getSenders().find(function (s) {
              return s.track === track;
            });
          };

          // replace the internal stream id with the external one and
          // vice versa.
          function replaceInternalStreamId(pc, description) {
            var sdp = description.sdp;
            Object.keys(pc._reverseStreams || []).forEach(function (internalId) {
              var externalStream = pc._reverseStreams[internalId];
              var internalStream = pc._streams[externalStream.id];
              sdp = sdp.replace(new RegExp(internalStream.id, 'g'), externalStream.id);
            });
            return new RTCSessionDescription({
              type: description.type,
              sdp: sdp
            });
          }
          function replaceExternalStreamId(pc, description) {
            var sdp = description.sdp;
            Object.keys(pc._reverseStreams || []).forEach(function (internalId) {
              var externalStream = pc._reverseStreams[internalId];
              var internalStream = pc._streams[externalStream.id];
              sdp = sdp.replace(new RegExp(externalStream.id, 'g'), internalStream.id);
            });
            return new RTCSessionDescription({
              type: description.type,
              sdp: sdp
            });
          }
          ['createOffer', 'createAnswer'].forEach(function (method) {
            var nativeMethod = window.RTCPeerConnection.prototype[method];
            window.RTCPeerConnection.prototype[method] = function () {
              var pc = this;
              var args = arguments;
              var isLegacyCall = arguments.length && typeof arguments[0] === 'function';
              if (isLegacyCall) {
                return nativeMethod.apply(pc, [function (description) {
                  var desc = replaceInternalStreamId(pc, description);
                  args[0].apply(null, [desc]);
                }, function (err) {
                  if (args[1]) {
                    args[1].apply(null, err);
                  }
                }, arguments[2]]);
              }
              return nativeMethod.apply(pc, arguments).then(function (description) {
                return replaceInternalStreamId(pc, description);
              });
            };
          });

          var origSetLocalDescription = window.RTCPeerConnection.prototype.setLocalDescription;
          window.RTCPeerConnection.prototype.setLocalDescription = function () {
            var pc = this;
            if (!arguments.length || !arguments[0].type) {
              return origSetLocalDescription.apply(pc, arguments);
            }
            arguments[0] = replaceExternalStreamId(pc, arguments[0]);
            return origSetLocalDescription.apply(pc, arguments);
          };

          // TODO: mangle getStats: https://w3c.github.io/webrtc-stats/#dom-rtcmediastreamstats-streamidentifier

          var origLocalDescription = Object.getOwnPropertyDescriptor(window.RTCPeerConnection.prototype, 'localDescription');
          Object.defineProperty(window.RTCPeerConnection.prototype, 'localDescription', {
            get: function get() {
              var pc = this;
              var description = origLocalDescription.get.apply(this);
              if (description.type === '') {
                return description;
              }
              return replaceInternalStreamId(pc, description);
            }
          });

          window.RTCPeerConnection.prototype.removeTrack = function (sender) {
            var pc = this;
            if (pc.signalingState === 'closed') {
              throw new DOMException('The RTCPeerConnection\'s signalingState is \'closed\'.', 'InvalidStateError');
            }
            // We can not yet check for sender instanceof RTCRtpSender
            // since we shim RTPSender. So we check if sender._pc is set.
            if (!sender._pc) {
              throw new DOMException('Argument 1 of RTCPeerConnection.removeTrack ' + 'does not implement interface RTCRtpSender.', 'TypeError');
            }
            var isLocal = sender._pc === pc;
            if (!isLocal) {
              throw new DOMException('Sender was not created by this connection.', 'InvalidAccessError');
            }

            // Search for the native stream the senders track belongs to.
            pc._streams = pc._streams || {};
            var stream;
            Object.keys(pc._streams).forEach(function (streamid) {
              var hasTrack = pc._streams[streamid].getTracks().find(function (track) {
                return sender.track === track;
              });
              if (hasTrack) {
                stream = pc._streams[streamid];
              }
            });

            if (stream) {
              if (stream.getTracks().length === 1) {
                // if this is the last track of the stream, remove the stream. This
                // takes care of any shimmed _senders.
                pc.removeStream(pc._reverseStreams[stream.id]);
              } else {
                // relying on the same odd chrome behaviour as above.
                stream.removeTrack(sender.track);
              }
              pc.dispatchEvent(new Event('negotiationneeded'));
            }
          };
        },

        shimPeerConnection: function shimPeerConnection(window) {
          var browserDetails = utils.detectBrowser(window);

          // The RTCPeerConnection object.
          if (!window.RTCPeerConnection && window.webkitRTCPeerConnection) {
            window.RTCPeerConnection = function (pcConfig, pcConstraints) {
              // Translate iceTransportPolicy to iceTransports,
              // see https://code.google.com/p/webrtc/issues/detail?id=4869
              // this was fixed in M56 along with unprefixing RTCPeerConnection.
              logging('PeerConnection');
              if (pcConfig && pcConfig.iceTransportPolicy) {
                pcConfig.iceTransports = pcConfig.iceTransportPolicy;
              }

              return new window.webkitRTCPeerConnection(pcConfig, pcConstraints);
            };
            window.RTCPeerConnection.prototype = window.webkitRTCPeerConnection.prototype;
            // wrap static methods. Currently just generateCertificate.
            if (window.webkitRTCPeerConnection.generateCertificate) {
              Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
                get: function get() {
                  return window.webkitRTCPeerConnection.generateCertificate;
                }
              });
            }
          } else {
            // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
            var OrigPeerConnection = window.RTCPeerConnection;
            window.RTCPeerConnection = function (pcConfig, pcConstraints) {
              if (pcConfig && pcConfig.iceServers) {
                var newIceServers = [];
                for (var i = 0; i < pcConfig.iceServers.length; i++) {
                  var server = pcConfig.iceServers[i];
                  if (!server.hasOwnProperty('urls') && server.hasOwnProperty('url')) {
                    utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
                    server = JSON.parse(JSON.stringify(server));
                    server.urls = server.url;
                    newIceServers.push(server);
                  } else {
                    newIceServers.push(pcConfig.iceServers[i]);
                  }
                }
                pcConfig.iceServers = newIceServers;
              }
              return new OrigPeerConnection(pcConfig, pcConstraints);
            };
            window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
            // wrap static methods. Currently just generateCertificate.
            Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
              get: function get() {
                return OrigPeerConnection.generateCertificate;
              }
            });
          }

          var origGetStats = window.RTCPeerConnection.prototype.getStats;
          window.RTCPeerConnection.prototype.getStats = function (selector, successCallback, errorCallback) {
            var pc = this;
            var args = arguments;

            // If selector is a function then we are in the old style stats so just
            // pass back the original getStats format to avoid breaking old users.
            if (arguments.length > 0 && typeof selector === 'function') {
              return origGetStats.apply(this, arguments);
            }

            // When spec-style getStats is supported, return those when called with
            // either no arguments or the selector argument is null.
            if (origGetStats.length === 0 && (arguments.length === 0 || typeof arguments[0] !== 'function')) {
              return origGetStats.apply(this, []);
            }

            var fixChromeStats_ = function fixChromeStats_(response) {
              var standardReport = {};
              var reports = response.result();
              reports.forEach(function (report) {
                var standardStats = {
                  id: report.id,
                  timestamp: report.timestamp,
                  type: {
                    localcandidate: 'local-candidate',
                    remotecandidate: 'remote-candidate'
                  }[report.type] || report.type
                };
                report.names().forEach(function (name) {
                  standardStats[name] = report.stat(name);
                });
                standardReport[standardStats.id] = standardStats;
              });

              return standardReport;
            };

            // shim getStats with maplike support
            var makeMapStats = function makeMapStats(stats) {
              return new Map(Object.keys(stats).map(function (key) {
                return [key, stats[key]];
              }));
            };

            if (arguments.length >= 2) {
              var successCallbackWrapper_ = function successCallbackWrapper_(response) {
                args[1](makeMapStats(fixChromeStats_(response)));
              };

              return origGetStats.apply(this, [successCallbackWrapper_, arguments[0]]);
            }

            // promise-support
            return new Promise(function (resolve, reject) {
              origGetStats.apply(pc, [function (response) {
                resolve(makeMapStats(fixChromeStats_(response)));
              }, reject]);
            }).then(successCallback, errorCallback);
          };

          // add promise support -- natively available in Chrome 51
          if (browserDetails.version < 51) {
            ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
              var nativeMethod = window.RTCPeerConnection.prototype[method];
              window.RTCPeerConnection.prototype[method] = function () {
                var args = arguments;
                var pc = this;
                var promise = new Promise(function (resolve, reject) {
                  nativeMethod.apply(pc, [args[0], resolve, reject]);
                });
                if (args.length < 2) {
                  return promise;
                }
                return promise.then(function () {
                  args[1].apply(null, []);
                }, function (err) {
                  if (args.length >= 3) {
                    args[2].apply(null, [err]);
                  }
                });
              };
            });
          }

          // promise support for createOffer and createAnswer. Available (without
          // bugs) since M52: crbug/619289
          if (browserDetails.version < 52) {
            ['createOffer', 'createAnswer'].forEach(function (method) {
              var nativeMethod = window.RTCPeerConnection.prototype[method];
              window.RTCPeerConnection.prototype[method] = function () {
                var pc = this;
                if (arguments.length < 1 || arguments.length === 1 && _typeof(arguments[0]) === 'object') {
                  var opts = arguments.length === 1 ? arguments[0] : undefined;
                  return new Promise(function (resolve, reject) {
                    nativeMethod.apply(pc, [resolve, reject, opts]);
                  });
                }
                return nativeMethod.apply(this, arguments);
              };
            });
          }

          // shim implicit creation of RTCSessionDescription/RTCIceCandidate
          ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
            var nativeMethod = window.RTCPeerConnection.prototype[method];
            window.RTCPeerConnection.prototype[method] = function () {
              arguments[0] = new (method === 'addIceCandidate' ? window.RTCIceCandidate : window.RTCSessionDescription)(arguments[0]);
              return nativeMethod.apply(this, arguments);
            };
          });

          // support for addIceCandidate(null or undefined)
          var nativeAddIceCandidate = window.RTCPeerConnection.prototype.addIceCandidate;
          window.RTCPeerConnection.prototype.addIceCandidate = function () {
            if (!arguments[0]) {
              if (arguments[1]) {
                arguments[1].apply(null);
              }
              return Promise.resolve();
            }
            return nativeAddIceCandidate.apply(this, arguments);
          };
        }
      };
    }, { "../utils.js": 13, "./getusermedia": 6 }], 6: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var utils = require('../utils.js');
      var logging = utils.log;

      // Expose public methods.
      module.exports = function (window) {
        var browserDetails = utils.detectBrowser(window);
        var navigator = window && window.navigator;

        var constraintsToChrome_ = function constraintsToChrome_(c) {
          if ((typeof c === "undefined" ? "undefined" : _typeof(c)) !== 'object' || c.mandatory || c.optional) {
            return c;
          }
          var cc = {};
          Object.keys(c).forEach(function (key) {
            if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
              return;
            }
            var r = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
            if (r.exact !== undefined && typeof r.exact === 'number') {
              r.min = r.max = r.exact;
            }
            var oldname_ = function oldname_(prefix, name) {
              if (prefix) {
                return prefix + name.charAt(0).toUpperCase() + name.slice(1);
              }
              return name === 'deviceId' ? 'sourceId' : name;
            };
            if (r.ideal !== undefined) {
              cc.optional = cc.optional || [];
              var oc = {};
              if (typeof r.ideal === 'number') {
                oc[oldname_('min', key)] = r.ideal;
                cc.optional.push(oc);
                oc = {};
                oc[oldname_('max', key)] = r.ideal;
                cc.optional.push(oc);
              } else {
                oc[oldname_('', key)] = r.ideal;
                cc.optional.push(oc);
              }
            }
            if (r.exact !== undefined && typeof r.exact !== 'number') {
              cc.mandatory = cc.mandatory || {};
              cc.mandatory[oldname_('', key)] = r.exact;
            } else {
              ['min', 'max'].forEach(function (mix) {
                if (r[mix] !== undefined) {
                  cc.mandatory = cc.mandatory || {};
                  cc.mandatory[oldname_(mix, key)] = r[mix];
                }
              });
            }
          });
          if (c.advanced) {
            cc.optional = (cc.optional || []).concat(c.advanced);
          }
          return cc;
        };

        var shimConstraints_ = function shimConstraints_(constraints, func) {
          if (browserDetails.version >= 61) {
            return func(constraints);
          }
          constraints = JSON.parse(JSON.stringify(constraints));
          if (constraints && _typeof(constraints.audio) === 'object') {
            var remap = function remap(obj, a, b) {
              if (a in obj && !(b in obj)) {
                obj[b] = obj[a];
                delete obj[a];
              }
            };
            constraints = JSON.parse(JSON.stringify(constraints));
            remap(constraints.audio, 'autoGainControl', 'googAutoGainControl');
            remap(constraints.audio, 'noiseSuppression', 'googNoiseSuppression');
            constraints.audio = constraintsToChrome_(constraints.audio);
          }
          if (constraints && _typeof(constraints.video) === 'object') {
            // Shim facingMode for mobile & surface pro.
            var face = constraints.video.facingMode;
            face = face && ((typeof face === "undefined" ? "undefined" : _typeof(face)) === 'object' ? face : { ideal: face });
            var getSupportedFacingModeLies = browserDetails.version < 66;

            if (face && (face.exact === 'user' || face.exact === 'environment' || face.ideal === 'user' || face.ideal === 'environment') && !(navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints().facingMode && !getSupportedFacingModeLies)) {
              delete constraints.video.facingMode;
              var matches;
              if (face.exact === 'environment' || face.ideal === 'environment') {
                matches = ['back', 'rear'];
              } else if (face.exact === 'user' || face.ideal === 'user') {
                matches = ['front'];
              }
              if (matches) {
                // Look for matches in label, or use last cam for back (typical).
                return navigator.mediaDevices.enumerateDevices().then(function (devices) {
                  devices = devices.filter(function (d) {
                    return d.kind === 'videoinput';
                  });
                  var dev = devices.find(function (d) {
                    return matches.some(function (match) {
                      return d.label.toLowerCase().indexOf(match) !== -1;
                    });
                  });
                  if (!dev && devices.length && matches.indexOf('back') !== -1) {
                    dev = devices[devices.length - 1]; // more likely the back cam
                  }
                  if (dev) {
                    constraints.video.deviceId = face.exact ? { exact: dev.deviceId } : { ideal: dev.deviceId };
                  }
                  constraints.video = constraintsToChrome_(constraints.video);
                  logging('chrome: ' + JSON.stringify(constraints));
                  return func(constraints);
                });
              }
            }
            constraints.video = constraintsToChrome_(constraints.video);
          }
          logging('chrome: ' + JSON.stringify(constraints));
          return func(constraints);
        };

        var shimError_ = function shimError_(e) {
          return {
            name: {
              PermissionDeniedError: 'NotAllowedError',
              PermissionDismissedError: 'NotAllowedError',
              InvalidStateError: 'NotAllowedError',
              DevicesNotFoundError: 'NotFoundError',
              ConstraintNotSatisfiedError: 'OverconstrainedError',
              TrackStartError: 'NotReadableError',
              MediaDeviceFailedDueToShutdown: 'NotAllowedError',
              MediaDeviceKillSwitchOn: 'NotAllowedError',
              TabCaptureError: 'AbortError',
              ScreenCaptureError: 'AbortError',
              DeviceCaptureError: 'AbortError'
            }[e.name] || e.name,
            message: e.message,
            constraint: e.constraintName,
            toString: function toString() {
              return this.name + (this.message && ': ') + this.message;
            }
          };
        };

        var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
          shimConstraints_(constraints, function (c) {
            navigator.webkitGetUserMedia(c, onSuccess, function (e) {
              if (onError) {
                onError(shimError_(e));
              }
            });
          });
        };

        navigator.getUserMedia = getUserMedia_;

        // Returns the result of getUserMedia as a Promise.
        var getUserMediaPromise_ = function getUserMediaPromise_(constraints) {
          return new Promise(function (resolve, reject) {
            navigator.getUserMedia(constraints, resolve, reject);
          });
        };

        if (!navigator.mediaDevices) {
          navigator.mediaDevices = {
            getUserMedia: getUserMediaPromise_,
            enumerateDevices: function enumerateDevices() {
              return new Promise(function (resolve) {
                var kinds = { audio: 'audioinput', video: 'videoinput' };
                return window.MediaStreamTrack.getSources(function (devices) {
                  resolve(devices.map(function (device) {
                    return { label: device.label,
                      kind: kinds[device.kind],
                      deviceId: device.id,
                      groupId: '' };
                  }));
                });
              });
            },
            getSupportedConstraints: function getSupportedConstraints() {
              return {
                deviceId: true, echoCancellation: true, facingMode: true,
                frameRate: true, height: true, width: true
              };
            }
          };
        }

        // A shim for getUserMedia method on the mediaDevices object.
        // TODO(KaptenJansson) remove once implemented in Chrome stable.
        if (!navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia = function (constraints) {
            return getUserMediaPromise_(constraints);
          };
        } else {
          // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
          // function which returns a Promise, it does not accept spec-style
          // constraints.
          var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = function (cs) {
            return shimConstraints_(cs, function (c) {
              return origGetUserMedia(c).then(function (stream) {
                if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
                  stream.getTracks().forEach(function (track) {
                    track.stop();
                  });
                  throw new DOMException('', 'NotFoundError');
                }
                return stream;
              }, function (e) {
                return Promise.reject(shimError_(e));
              });
            });
          };
        }

        // Dummy devicechange event methods.
        // TODO(KaptenJansson) remove once implemented in Chrome stable.
        if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
          navigator.mediaDevices.addEventListener = function () {
            logging('Dummy mediaDevices.addEventListener called.');
          };
        }
        if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
          navigator.mediaDevices.removeEventListener = function () {
            logging('Dummy mediaDevices.removeEventListener called.');
          };
        }
      };
    }, { "../utils.js": 13 }], 7: [function (require, module, exports) {
      /*
       *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var SDPUtils = require('sdp');
      var utils = require('./utils');

      module.exports = {
        shimRTCIceCandidate: function shimRTCIceCandidate(window) {
          // foundation is arbitrarily chosen as an indicator for full support for
          // https://w3c.github.io/webrtc-pc/#rtcicecandidate-interface
          if (!window.RTCIceCandidate || window.RTCIceCandidate && 'foundation' in window.RTCIceCandidate.prototype) {
            return;
          }

          var NativeRTCIceCandidate = window.RTCIceCandidate;
          window.RTCIceCandidate = function (args) {
            // Remove the a= which shouldn't be part of the candidate string.
            if ((typeof args === "undefined" ? "undefined" : _typeof(args)) === 'object' && args.candidate && args.candidate.indexOf('a=') === 0) {
              args = JSON.parse(JSON.stringify(args));
              args.candidate = args.candidate.substr(2);
            }

            if (args.candidate && args.candidate.length) {
              // Augment the native candidate with the parsed fields.
              var nativeCandidate = new NativeRTCIceCandidate(args);
              var parsedCandidate = SDPUtils.parseCandidate(args.candidate);
              var augmentedCandidate = _extends(nativeCandidate, parsedCandidate);

              // Add a serializer that does not serialize the extra attributes.
              augmentedCandidate.toJSON = function () {
                return {
                  candidate: augmentedCandidate.candidate,
                  sdpMid: augmentedCandidate.sdpMid,
                  sdpMLineIndex: augmentedCandidate.sdpMLineIndex,
                  usernameFragment: augmentedCandidate.usernameFragment
                };
              };
              return augmentedCandidate;
            }
            return new NativeRTCIceCandidate(args);
          };
          window.RTCIceCandidate.prototype = NativeRTCIceCandidate.prototype;

          // Hook up the augmented candidate in onicecandidate and
          // addEventListener('icecandidate', ...)
          utils.wrapPeerConnectionEvent(window, 'icecandidate', function (e) {
            if (e.candidate) {
              Object.defineProperty(e, 'candidate', {
                value: new window.RTCIceCandidate(e.candidate),
                writable: 'false'
              });
            }
            return e;
          });
        },

        // shimCreateObjectURL must be called before shimSourceObject to avoid loop.

        shimCreateObjectURL: function shimCreateObjectURL(window) {
          var URL = window && window.URL;

          if (!((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.HTMLMediaElement && 'srcObject' in window.HTMLMediaElement.prototype && URL.createObjectURL && URL.revokeObjectURL)) {
            // Only shim CreateObjectURL using srcObject if srcObject exists.
            return undefined;
          }

          var nativeCreateObjectURL = URL.createObjectURL.bind(URL);
          var nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL);
          var streams = new Map(),
              newId = 0;

          URL.createObjectURL = function (stream) {
            if ('getTracks' in stream) {
              var url = 'polyblob:' + ++newId;
              streams.set(url, stream);
              utils.deprecated('URL.createObjectURL(stream)', 'elem.srcObject = stream');
              return url;
            }
            return nativeCreateObjectURL(stream);
          };
          URL.revokeObjectURL = function (url) {
            nativeRevokeObjectURL(url);
            streams.delete(url);
          };

          var dsc = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, 'src');
          Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
            get: function get() {
              return dsc.get.apply(this);
            },
            set: function set(url) {
              this.srcObject = streams.get(url) || null;
              return dsc.set.apply(this, [url]);
            }
          });

          var nativeSetAttribute = window.HTMLMediaElement.prototype.setAttribute;
          window.HTMLMediaElement.prototype.setAttribute = function () {
            if (arguments.length === 2 && ('' + arguments[0]).toLowerCase() === 'src') {
              this.srcObject = streams.get(arguments[1]) || null;
            }
            return nativeSetAttribute.apply(this, arguments);
          };
        },

        shimMaxMessageSize: function shimMaxMessageSize(window) {
          if (window.RTCSctpTransport || !window.RTCPeerConnection) {
            return;
          }
          var browserDetails = utils.detectBrowser(window);

          if (!('sctp' in window.RTCPeerConnection.prototype)) {
            Object.defineProperty(window.RTCPeerConnection.prototype, 'sctp', {
              get: function get() {
                return typeof this._sctp === 'undefined' ? null : this._sctp;
              }
            });
          }

          var sctpInDescription = function sctpInDescription(description) {
            var sections = SDPUtils.splitSections(description.sdp);
            sections.shift();
            return sections.some(function (mediaSection) {
              var mLine = SDPUtils.parseMLine(mediaSection);
              return mLine && mLine.kind === 'application' && mLine.protocol.indexOf('SCTP') !== -1;
            });
          };

          var getRemoteFirefoxVersion = function getRemoteFirefoxVersion(description) {
            // TODO: Is there a better solution for detecting Firefox?
            var match = description.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
            if (match === null || match.length < 2) {
              return -1;
            }
            var version = parseInt(match[1], 10);
            // Test for NaN (yes, this is ugly)
            return version !== version ? -1 : version;
          };

          var getCanSendMaxMessageSize = function getCanSendMaxMessageSize(remoteIsFirefox) {
            // Every implementation we know can send at least 64 KiB.
            // Note: Although Chrome is technically able to send up to 256 KiB, the
            //       data does not reach the other peer reliably.
            //       See: https://bugs.chromium.org/p/webrtc/issues/detail?id=8419
            var canSendMaxMessageSize = 65536;
            if (browserDetails.browser === 'firefox') {
              if (browserDetails.version < 57) {
                if (remoteIsFirefox === -1) {
                  // FF < 57 will send in 16 KiB chunks using the deprecated PPID
                  // fragmentation.
                  canSendMaxMessageSize = 16384;
                } else {
                  // However, other FF (and RAWRTC) can reassemble PPID-fragmented
                  // messages. Thus, supporting ~2 GiB when sending.
                  canSendMaxMessageSize = 2147483637;
                }
              } else {
                // Currently, all FF >= 57 will reset the remote maximum message size
                // to the default value when a data channel is created at a later
                // stage. :(
                // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1426831
                canSendMaxMessageSize = browserDetails.version === 57 ? 65535 : 65536;
              }
            }
            return canSendMaxMessageSize;
          };

          var getMaxMessageSize = function getMaxMessageSize(description, remoteIsFirefox) {
            // Note: 65536 bytes is the default value from the SDP spec. Also,
            //       every implementation we know supports receiving 65536 bytes.
            var maxMessageSize = 65536;

            // FF 57 has a slightly incorrect default remote max message size, so
            // we need to adjust it here to avoid a failure when sending.
            // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1425697
            if (browserDetails.browser === 'firefox' && browserDetails.version === 57) {
              maxMessageSize = 65535;
            }

            var match = SDPUtils.matchPrefix(description.sdp, 'a=max-message-size:');
            if (match.length > 0) {
              maxMessageSize = parseInt(match[0].substr(19), 10);
            } else if (browserDetails.browser === 'firefox' && remoteIsFirefox !== -1) {
              // If the maximum message size is not present in the remote SDP and
              // both local and remote are Firefox, the remote peer can receive
              // ~2 GiB.
              maxMessageSize = 2147483637;
            }
            return maxMessageSize;
          };

          var origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
          window.RTCPeerConnection.prototype.setRemoteDescription = function () {
            var pc = this;
            pc._sctp = null;

            if (sctpInDescription(arguments[0])) {
              // Check if the remote is FF.
              var isFirefox = getRemoteFirefoxVersion(arguments[0]);

              // Get the maximum message size the local peer is capable of sending
              var canSendMMS = getCanSendMaxMessageSize(isFirefox);

              // Get the maximum message size of the remote peer.
              var remoteMMS = getMaxMessageSize(arguments[0], isFirefox);

              // Determine final maximum message size
              var maxMessageSize;
              if (canSendMMS === 0 && remoteMMS === 0) {
                maxMessageSize = Number.POSITIVE_INFINITY;
              } else if (canSendMMS === 0 || remoteMMS === 0) {
                maxMessageSize = Math.max(canSendMMS, remoteMMS);
              } else {
                maxMessageSize = Math.min(canSendMMS, remoteMMS);
              }

              // Create a dummy RTCSctpTransport object and the 'maxMessageSize'
              // attribute.
              var sctp = {};
              Object.defineProperty(sctp, 'maxMessageSize', {
                get: function get() {
                  return maxMessageSize;
                }
              });
              pc._sctp = sctp;
            }

            return origSetRemoteDescription.apply(pc, arguments);
          };
        },

        shimSendThrowTypeError: function shimSendThrowTypeError(window) {
          if (!(window.RTCPeerConnection && 'createDataChannel' in window.RTCPeerConnection.prototype)) {
            return;
          }

          // Note: Although Firefox >= 57 has a native implementation, the maximum
          //       message size can be reset for all data channels at a later stage.
          //       See: https://bugzilla.mozilla.org/show_bug.cgi?id=1426831

          var origCreateDataChannel = window.RTCPeerConnection.prototype.createDataChannel;
          window.RTCPeerConnection.prototype.createDataChannel = function () {
            var pc = this;
            var dataChannel = origCreateDataChannel.apply(pc, arguments);
            var origDataChannelSend = dataChannel.send;

            // Patch 'send' method
            dataChannel.send = function () {
              var dc = this;
              var data = arguments[0];
              var length = data.length || data.size || data.byteLength;
              if (length > pc.sctp.maxMessageSize) {
                throw new DOMException('Message too large (can send a maximum of ' + pc.sctp.maxMessageSize + ' bytes)', 'TypeError');
              }
              return origDataChannelSend.apply(dc, arguments);
            };

            return dataChannel;
          };
        }
      };
    }, { "./utils": 13, "sdp": 2 }], 8: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var utils = require('../utils');
      var shimRTCPeerConnection = require('rtcpeerconnection-shim');

      module.exports = {
        shimGetUserMedia: require('./getusermedia'),
        shimPeerConnection: function shimPeerConnection(window) {
          var browserDetails = utils.detectBrowser(window);

          if (window.RTCIceGatherer) {
            if (!window.RTCIceCandidate) {
              window.RTCIceCandidate = function (args) {
                return args;
              };
            }
            if (!window.RTCSessionDescription) {
              window.RTCSessionDescription = function (args) {
                return args;
              };
            }
            // this adds an additional event listener to MediaStrackTrack that signals
            // when a tracks enabled property was changed. Workaround for a bug in
            // addStream, see below. No longer required in 15025+
            if (browserDetails.version < 15025) {
              var origMSTEnabled = Object.getOwnPropertyDescriptor(window.MediaStreamTrack.prototype, 'enabled');
              Object.defineProperty(window.MediaStreamTrack.prototype, 'enabled', {
                set: function set(value) {
                  origMSTEnabled.set.call(this, value);
                  var ev = new Event('enabled');
                  ev.enabled = value;
                  this.dispatchEvent(ev);
                }
              });
            }
          }

          // ORTC defines the DTMF sender a bit different.
          // https://github.com/w3c/ortc/issues/714
          if (window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
            Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
              get: function get() {
                if (this._dtmf === undefined) {
                  if (this.track.kind === 'audio') {
                    this._dtmf = new window.RTCDtmfSender(this);
                  } else if (this.track.kind === 'video') {
                    this._dtmf = null;
                  }
                }
                return this._dtmf;
              }
            });
          }
          // Edge currently only implements the RTCDtmfSender, not the
          // RTCDTMFSender alias. See http://draft.ortc.org/#rtcdtmfsender2*
          if (window.RTCDtmfSender && !window.RTCDTMFSender) {
            window.RTCDTMFSender = window.RTCDtmfSender;
          }

          window.RTCPeerConnection = shimRTCPeerConnection(window, browserDetails.version);
        },
        shimReplaceTrack: function shimReplaceTrack(window) {
          // ORTC has replaceTrack -- https://github.com/w3c/ortc/issues/614
          if (window.RTCRtpSender && !('replaceTrack' in window.RTCRtpSender.prototype)) {
            window.RTCRtpSender.prototype.replaceTrack = window.RTCRtpSender.prototype.setTrack;
          }
        }
      };
    }, { "../utils": 13, "./getusermedia": 9, "rtcpeerconnection-shim": 1 }], 9: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      // Expose public methods.

      module.exports = function (window) {
        var navigator = window && window.navigator;

        var shimError_ = function shimError_(e) {
          return {
            name: { PermissionDeniedError: 'NotAllowedError' }[e.name] || e.name,
            message: e.message,
            constraint: e.constraint,
            toString: function toString() {
              return this.name;
            }
          };
        };

        // getUserMedia error shim.
        var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function (c) {
          return origGetUserMedia(c).catch(function (e) {
            return Promise.reject(shimError_(e));
          });
        };
      };
    }, {}], 10: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var utils = require('../utils');

      module.exports = {
        shimGetUserMedia: require('./getusermedia'),
        shimOnTrack: function shimOnTrack(window) {
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.RTCPeerConnection && !('ontrack' in window.RTCPeerConnection.prototype)) {
            Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
              get: function get() {
                return this._ontrack;
              },
              set: function set(f) {
                if (this._ontrack) {
                  this.removeEventListener('track', this._ontrack);
                  this.removeEventListener('addstream', this._ontrackpoly);
                }
                this.addEventListener('track', this._ontrack = f);
                this.addEventListener('addstream', this._ontrackpoly = function (e) {
                  e.stream.getTracks().forEach(function (track) {
                    var event = new Event('track');
                    event.track = track;
                    event.receiver = { track: track };
                    event.transceiver = { receiver: event.receiver };
                    event.streams = [e.stream];
                    this.dispatchEvent(event);
                  }.bind(this));
                }.bind(this));
              }
            });
          }
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.RTCTrackEvent && 'receiver' in window.RTCTrackEvent.prototype && !('transceiver' in window.RTCTrackEvent.prototype)) {
            Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
              get: function get() {
                return { receiver: this.receiver };
              }
            });
          }
        },

        shimSourceObject: function shimSourceObject(window) {
          // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object') {
            if (window.HTMLMediaElement && !('srcObject' in window.HTMLMediaElement.prototype)) {
              // Shim the srcObject property, once, when HTMLMediaElement is found.
              Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
                get: function get() {
                  return this.mozSrcObject;
                },
                set: function set(stream) {
                  this.mozSrcObject = stream;
                }
              });
            }
          }
        },

        shimPeerConnection: function shimPeerConnection(window) {
          var browserDetails = utils.detectBrowser(window);

          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) !== 'object' || !(window.RTCPeerConnection || window.mozRTCPeerConnection)) {
            return; // probably media.peerconnection.enabled=false in about:config
          }
          // The RTCPeerConnection object.
          if (!window.RTCPeerConnection) {
            window.RTCPeerConnection = function (pcConfig, pcConstraints) {
              if (browserDetails.version < 38) {
                // .urls is not supported in FF < 38.
                // create RTCIceServers with a single url.
                if (pcConfig && pcConfig.iceServers) {
                  var newIceServers = [];
                  for (var i = 0; i < pcConfig.iceServers.length; i++) {
                    var server = pcConfig.iceServers[i];
                    if (server.hasOwnProperty('urls')) {
                      for (var j = 0; j < server.urls.length; j++) {
                        var newServer = {
                          url: server.urls[j]
                        };
                        if (server.urls[j].indexOf('turn') === 0) {
                          newServer.username = server.username;
                          newServer.credential = server.credential;
                        }
                        newIceServers.push(newServer);
                      }
                    } else {
                      newIceServers.push(pcConfig.iceServers[i]);
                    }
                  }
                  pcConfig.iceServers = newIceServers;
                }
              }
              return new window.mozRTCPeerConnection(pcConfig, pcConstraints);
            };
            window.RTCPeerConnection.prototype = window.mozRTCPeerConnection.prototype;

            // wrap static methods. Currently just generateCertificate.
            if (window.mozRTCPeerConnection.generateCertificate) {
              Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
                get: function get() {
                  return window.mozRTCPeerConnection.generateCertificate;
                }
              });
            }

            window.RTCSessionDescription = window.mozRTCSessionDescription;
            window.RTCIceCandidate = window.mozRTCIceCandidate;
          }

          // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
          ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
            var nativeMethod = window.RTCPeerConnection.prototype[method];
            window.RTCPeerConnection.prototype[method] = function () {
              arguments[0] = new (method === 'addIceCandidate' ? window.RTCIceCandidate : window.RTCSessionDescription)(arguments[0]);
              return nativeMethod.apply(this, arguments);
            };
          });

          // support for addIceCandidate(null or undefined)
          var nativeAddIceCandidate = window.RTCPeerConnection.prototype.addIceCandidate;
          window.RTCPeerConnection.prototype.addIceCandidate = function () {
            if (!arguments[0]) {
              if (arguments[1]) {
                arguments[1].apply(null);
              }
              return Promise.resolve();
            }
            return nativeAddIceCandidate.apply(this, arguments);
          };

          // shim getStats with maplike support
          var makeMapStats = function makeMapStats(stats) {
            var map = new Map();
            Object.keys(stats).forEach(function (key) {
              map.set(key, stats[key]);
              map[key] = stats[key];
            });
            return map;
          };

          var modernStatsTypes = {
            inboundrtp: 'inbound-rtp',
            outboundrtp: 'outbound-rtp',
            candidatepair: 'candidate-pair',
            localcandidate: 'local-candidate',
            remotecandidate: 'remote-candidate'
          };

          var nativeGetStats = window.RTCPeerConnection.prototype.getStats;
          window.RTCPeerConnection.prototype.getStats = function (selector, onSucc, onErr) {
            return nativeGetStats.apply(this, [selector || null]).then(function (stats) {
              if (browserDetails.version < 48) {
                stats = makeMapStats(stats);
              }
              if (browserDetails.version < 53 && !onSucc) {
                // Shim only promise getStats with spec-hyphens in type names
                // Leave callback version alone; misc old uses of forEach before Map
                try {
                  stats.forEach(function (stat) {
                    stat.type = modernStatsTypes[stat.type] || stat.type;
                  });
                } catch (e) {
                  if (e.name !== 'TypeError') {
                    throw e;
                  }
                  // Avoid TypeError: "type" is read-only, in old versions. 34-43ish
                  stats.forEach(function (stat, i) {
                    stats.set(i, _extends({}, stat, {
                      type: modernStatsTypes[stat.type] || stat.type
                    }));
                  });
                }
              }
              return stats;
            }).then(onSucc, onErr);
          };
        },

        shimRemoveStream: function shimRemoveStream(window) {
          if (!window.RTCPeerConnection || 'removeStream' in window.RTCPeerConnection.prototype) {
            return;
          }
          window.RTCPeerConnection.prototype.removeStream = function (stream) {
            var pc = this;
            utils.deprecated('removeStream', 'removeTrack');
            this.getSenders().forEach(function (sender) {
              if (sender.track && stream.getTracks().indexOf(sender.track) !== -1) {
                pc.removeTrack(sender);
              }
            });
          };
        }
      };
    }, { "../utils": 13, "./getusermedia": 11 }], 11: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var utils = require('../utils');
      var logging = utils.log;

      // Expose public methods.
      module.exports = function (window) {
        var browserDetails = utils.detectBrowser(window);
        var navigator = window && window.navigator;
        var MediaStreamTrack = window && window.MediaStreamTrack;

        var shimError_ = function shimError_(e) {
          return {
            name: {
              InternalError: 'NotReadableError',
              NotSupportedError: 'TypeError',
              PermissionDeniedError: 'NotAllowedError',
              SecurityError: 'NotAllowedError'
            }[e.name] || e.name,
            message: {
              'The operation is insecure.': 'The request is not allowed by the ' + 'user agent or the platform in the current context.'
            }[e.message] || e.message,
            constraint: e.constraint,
            toString: function toString() {
              return this.name + (this.message && ': ') + this.message;
            }
          };
        };

        // getUserMedia constraints shim.
        var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
          var constraintsToFF37_ = function constraintsToFF37_(c) {
            if ((typeof c === "undefined" ? "undefined" : _typeof(c)) !== 'object' || c.require) {
              return c;
            }
            var require = [];
            Object.keys(c).forEach(function (key) {
              if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
                return;
              }
              var r = c[key] = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
              if (r.min !== undefined || r.max !== undefined || r.exact !== undefined) {
                require.push(key);
              }
              if (r.exact !== undefined) {
                if (typeof r.exact === 'number') {
                  r.min = r.max = r.exact;
                } else {
                  c[key] = r.exact;
                }
                delete r.exact;
              }
              if (r.ideal !== undefined) {
                c.advanced = c.advanced || [];
                var oc = {};
                if (typeof r.ideal === 'number') {
                  oc[key] = { min: r.ideal, max: r.ideal };
                } else {
                  oc[key] = r.ideal;
                }
                c.advanced.push(oc);
                delete r.ideal;
                if (!Object.keys(r).length) {
                  delete c[key];
                }
              }
            });
            if (require.length) {
              c.require = require;
            }
            return c;
          };
          constraints = JSON.parse(JSON.stringify(constraints));
          if (browserDetails.version < 38) {
            logging('spec: ' + JSON.stringify(constraints));
            if (constraints.audio) {
              constraints.audio = constraintsToFF37_(constraints.audio);
            }
            if (constraints.video) {
              constraints.video = constraintsToFF37_(constraints.video);
            }
            logging('ff37: ' + JSON.stringify(constraints));
          }
          return navigator.mozGetUserMedia(constraints, onSuccess, function (e) {
            onError(shimError_(e));
          });
        };

        // Returns the result of getUserMedia as a Promise.
        var getUserMediaPromise_ = function getUserMediaPromise_(constraints) {
          return new Promise(function (resolve, reject) {
            getUserMedia_(constraints, resolve, reject);
          });
        };

        // Shim for mediaDevices on older versions.
        if (!navigator.mediaDevices) {
          navigator.mediaDevices = { getUserMedia: getUserMediaPromise_,
            addEventListener: function addEventListener() {},
            removeEventListener: function removeEventListener() {}
          };
        }
        navigator.mediaDevices.enumerateDevices = navigator.mediaDevices.enumerateDevices || function () {
          return new Promise(function (resolve) {
            var infos = [{ kind: 'audioinput', deviceId: 'default', label: '', groupId: '' }, { kind: 'videoinput', deviceId: 'default', label: '', groupId: '' }];
            resolve(infos);
          });
        };

        if (browserDetails.version < 41) {
          // Work around http://bugzil.la/1169665
          var orgEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
          navigator.mediaDevices.enumerateDevices = function () {
            return orgEnumerateDevices().then(undefined, function (e) {
              if (e.name === 'NotFoundError') {
                return [];
              }
              throw e;
            });
          };
        }
        if (browserDetails.version < 49) {
          var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = function (c) {
            return origGetUserMedia(c).then(function (stream) {
              // Work around https://bugzil.la/802326
              if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
                stream.getTracks().forEach(function (track) {
                  track.stop();
                });
                throw new DOMException('The object can not be found here.', 'NotFoundError');
              }
              return stream;
            }, function (e) {
              return Promise.reject(shimError_(e));
            });
          };
        }
        if (!(browserDetails.version > 55 && 'autoGainControl' in navigator.mediaDevices.getSupportedConstraints())) {
          var remap = function remap(obj, a, b) {
            if (a in obj && !(b in obj)) {
              obj[b] = obj[a];
              delete obj[a];
            }
          };

          var nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = function (c) {
            if ((typeof c === "undefined" ? "undefined" : _typeof(c)) === 'object' && _typeof(c.audio) === 'object') {
              c = JSON.parse(JSON.stringify(c));
              remap(c.audio, 'autoGainControl', 'mozAutoGainControl');
              remap(c.audio, 'noiseSuppression', 'mozNoiseSuppression');
            }
            return nativeGetUserMedia(c);
          };

          if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
            var nativeGetSettings = MediaStreamTrack.prototype.getSettings;
            MediaStreamTrack.prototype.getSettings = function () {
              var obj = nativeGetSettings.apply(this, arguments);
              remap(obj, 'mozAutoGainControl', 'autoGainControl');
              remap(obj, 'mozNoiseSuppression', 'noiseSuppression');
              return obj;
            };
          }

          if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
            var nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
            MediaStreamTrack.prototype.applyConstraints = function (c) {
              if (this.kind === 'audio' && (typeof c === "undefined" ? "undefined" : _typeof(c)) === 'object') {
                c = JSON.parse(JSON.stringify(c));
                remap(c, 'autoGainControl', 'mozAutoGainControl');
                remap(c, 'noiseSuppression', 'mozNoiseSuppression');
              }
              return nativeApplyConstraints.apply(this, [c]);
            };
          }
        }
        navigator.getUserMedia = function (constraints, onSuccess, onError) {
          if (browserDetails.version < 44) {
            return getUserMedia_(constraints, onSuccess, onError);
          }
          // Replace Firefox 44+'s deprecation warning with unprefixed version.
          utils.deprecated('navigator.getUserMedia', 'navigator.mediaDevices.getUserMedia');
          navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
        };
      };
    }, { "../utils": 13 }], 12: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      'use strict';

      var utils = require('../utils');

      module.exports = {
        shimLocalStreamsAPI: function shimLocalStreamsAPI(window) {
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) !== 'object' || !window.RTCPeerConnection) {
            return;
          }
          if (!('getLocalStreams' in window.RTCPeerConnection.prototype)) {
            window.RTCPeerConnection.prototype.getLocalStreams = function () {
              if (!this._localStreams) {
                this._localStreams = [];
              }
              return this._localStreams;
            };
          }
          if (!('getStreamById' in window.RTCPeerConnection.prototype)) {
            window.RTCPeerConnection.prototype.getStreamById = function (id) {
              var result = null;
              if (this._localStreams) {
                this._localStreams.forEach(function (stream) {
                  if (stream.id === id) {
                    result = stream;
                  }
                });
              }
              if (this._remoteStreams) {
                this._remoteStreams.forEach(function (stream) {
                  if (stream.id === id) {
                    result = stream;
                  }
                });
              }
              return result;
            };
          }
          if (!('addStream' in window.RTCPeerConnection.prototype)) {
            var _addTrack = window.RTCPeerConnection.prototype.addTrack;
            window.RTCPeerConnection.prototype.addStream = function (stream) {
              if (!this._localStreams) {
                this._localStreams = [];
              }
              if (this._localStreams.indexOf(stream) === -1) {
                this._localStreams.push(stream);
              }
              var pc = this;
              stream.getTracks().forEach(function (track) {
                _addTrack.call(pc, track, stream);
              });
            };

            window.RTCPeerConnection.prototype.addTrack = function (track, stream) {
              if (stream) {
                if (!this._localStreams) {
                  this._localStreams = [stream];
                } else if (this._localStreams.indexOf(stream) === -1) {
                  this._localStreams.push(stream);
                }
              }
              return _addTrack.call(this, track, stream);
            };
          }
          if (!('removeStream' in window.RTCPeerConnection.prototype)) {
            window.RTCPeerConnection.prototype.removeStream = function (stream) {
              if (!this._localStreams) {
                this._localStreams = [];
              }
              var index = this._localStreams.indexOf(stream);
              if (index === -1) {
                return;
              }
              this._localStreams.splice(index, 1);
              var pc = this;
              var tracks = stream.getTracks();
              this.getSenders().forEach(function (sender) {
                if (tracks.indexOf(sender.track) !== -1) {
                  pc.removeTrack(sender);
                }
              });
            };
          }
        },
        shimRemoteStreamsAPI: function shimRemoteStreamsAPI(window) {
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) !== 'object' || !window.RTCPeerConnection) {
            return;
          }
          if (!('getRemoteStreams' in window.RTCPeerConnection.prototype)) {
            window.RTCPeerConnection.prototype.getRemoteStreams = function () {
              return this._remoteStreams ? this._remoteStreams : [];
            };
          }
          if (!('onaddstream' in window.RTCPeerConnection.prototype)) {
            Object.defineProperty(window.RTCPeerConnection.prototype, 'onaddstream', {
              get: function get() {
                return this._onaddstream;
              },
              set: function set(f) {
                var pc = this;
                if (this._onaddstream) {
                  this.removeEventListener('addstream', this._onaddstream);
                  this.removeEventListener('track', this._onaddstreampoly);
                }
                this.addEventListener('addstream', this._onaddstream = f);
                this.addEventListener('track', this._onaddstreampoly = function (e) {
                  e.streams.forEach(function (stream) {
                    if (!pc._remoteStreams) {
                      pc._remoteStreams = [];
                    }
                    if (pc._remoteStreams.indexOf(stream) >= 0) {
                      return;
                    }
                    pc._remoteStreams.push(stream);
                    var event = new Event('addstream');
                    event.stream = stream;
                    pc.dispatchEvent(event);
                  });
                });
              }
            });
          }
        },
        shimCallbacksAPI: function shimCallbacksAPI(window) {
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) !== 'object' || !window.RTCPeerConnection) {
            return;
          }
          var prototype = window.RTCPeerConnection.prototype;
          var createOffer = prototype.createOffer;
          var createAnswer = prototype.createAnswer;
          var setLocalDescription = prototype.setLocalDescription;
          var setRemoteDescription = prototype.setRemoteDescription;
          var addIceCandidate = prototype.addIceCandidate;

          prototype.createOffer = function (successCallback, failureCallback) {
            var options = arguments.length >= 2 ? arguments[2] : arguments[0];
            var promise = createOffer.apply(this, [options]);
            if (!failureCallback) {
              return promise;
            }
            promise.then(successCallback, failureCallback);
            return Promise.resolve();
          };

          prototype.createAnswer = function (successCallback, failureCallback) {
            var options = arguments.length >= 2 ? arguments[2] : arguments[0];
            var promise = createAnswer.apply(this, [options]);
            if (!failureCallback) {
              return promise;
            }
            promise.then(successCallback, failureCallback);
            return Promise.resolve();
          };

          var withCallback = function withCallback(description, successCallback, failureCallback) {
            var promise = setLocalDescription.apply(this, [description]);
            if (!failureCallback) {
              return promise;
            }
            promise.then(successCallback, failureCallback);
            return Promise.resolve();
          };
          prototype.setLocalDescription = withCallback;

          withCallback = function withCallback(description, successCallback, failureCallback) {
            var promise = setRemoteDescription.apply(this, [description]);
            if (!failureCallback) {
              return promise;
            }
            promise.then(successCallback, failureCallback);
            return Promise.resolve();
          };
          prototype.setRemoteDescription = withCallback;

          withCallback = function withCallback(candidate, successCallback, failureCallback) {
            var promise = addIceCandidate.apply(this, [candidate]);
            if (!failureCallback) {
              return promise;
            }
            promise.then(successCallback, failureCallback);
            return Promise.resolve();
          };
          prototype.addIceCandidate = withCallback;
        },
        shimGetUserMedia: function shimGetUserMedia(window) {
          var navigator = window && window.navigator;

          if (!navigator.getUserMedia) {
            if (navigator.webkitGetUserMedia) {
              navigator.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
            } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              navigator.getUserMedia = function (constraints, cb, errcb) {
                navigator.mediaDevices.getUserMedia(constraints).then(cb, errcb);
              }.bind(navigator);
            }
          }
        },
        shimRTCIceServerUrls: function shimRTCIceServerUrls(window) {
          // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
          var OrigPeerConnection = window.RTCPeerConnection;
          window.RTCPeerConnection = function (pcConfig, pcConstraints) {
            if (pcConfig && pcConfig.iceServers) {
              var newIceServers = [];
              for (var i = 0; i < pcConfig.iceServers.length; i++) {
                var server = pcConfig.iceServers[i];
                if (!server.hasOwnProperty('urls') && server.hasOwnProperty('url')) {
                  utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
                  server = JSON.parse(JSON.stringify(server));
                  server.urls = server.url;
                  delete server.url;
                  newIceServers.push(server);
                } else {
                  newIceServers.push(pcConfig.iceServers[i]);
                }
              }
              pcConfig.iceServers = newIceServers;
            }
            return new OrigPeerConnection(pcConfig, pcConstraints);
          };
          window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
          // wrap static methods. Currently just generateCertificate.
          if ('generateCertificate' in window.RTCPeerConnection) {
            Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
              get: function get() {
                return OrigPeerConnection.generateCertificate;
              }
            });
          }
        },
        shimTrackEventTransceiver: function shimTrackEventTransceiver(window) {
          // Add event.transceiver member over deprecated event.receiver
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && window.RTCPeerConnection && 'receiver' in window.RTCTrackEvent.prototype &&
          // can't check 'transceiver' in window.RTCTrackEvent.prototype, as it is
          // defined for some reason even when window.RTCTransceiver is not.
          !window.RTCTransceiver) {
            Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
              get: function get() {
                return { receiver: this.receiver };
              }
            });
          }
        },

        shimCreateOfferLegacy: function shimCreateOfferLegacy(window) {
          var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
          window.RTCPeerConnection.prototype.createOffer = function (offerOptions) {
            var pc = this;
            if (offerOptions) {
              if (typeof offerOptions.offerToReceiveAudio !== 'undefined') {
                // support bit values
                offerOptions.offerToReceiveAudio = !!offerOptions.offerToReceiveAudio;
              }
              var audioTransceiver = pc.getTransceivers().find(function (transceiver) {
                return transceiver.sender.track && transceiver.sender.track.kind === 'audio';
              });
              if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
                if (audioTransceiver.direction === 'sendrecv') {
                  if (audioTransceiver.setDirection) {
                    audioTransceiver.setDirection('sendonly');
                  } else {
                    audioTransceiver.direction = 'sendonly';
                  }
                } else if (audioTransceiver.direction === 'recvonly') {
                  if (audioTransceiver.setDirection) {
                    audioTransceiver.setDirection('inactive');
                  } else {
                    audioTransceiver.direction = 'inactive';
                  }
                }
              } else if (offerOptions.offerToReceiveAudio === true && !audioTransceiver) {
                pc.addTransceiver('audio');
              }

              if (typeof offerOptions.offerToReceiveAudio !== 'undefined') {
                // support bit values
                offerOptions.offerToReceiveVideo = !!offerOptions.offerToReceiveVideo;
              }
              var videoTransceiver = pc.getTransceivers().find(function (transceiver) {
                return transceiver.sender.track && transceiver.sender.track.kind === 'video';
              });
              if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
                if (videoTransceiver.direction === 'sendrecv') {
                  videoTransceiver.setDirection('sendonly');
                } else if (videoTransceiver.direction === 'recvonly') {
                  videoTransceiver.setDirection('inactive');
                }
              } else if (offerOptions.offerToReceiveVideo === true && !videoTransceiver) {
                pc.addTransceiver('video');
              }
            }
            return origCreateOffer.apply(pc, arguments);
          };
        }
      };
    }, { "../utils": 13 }], 13: [function (require, module, exports) {
      /*
       *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
       *
       *  Use of this source code is governed by a BSD-style license
       *  that can be found in the LICENSE file in the root of the source
       *  tree.
       */
      /* eslint-env node */
      'use strict';

      var logDisabled_ = true;
      var deprecationWarnings_ = true;

      /**
       * Extract browser version out of the provided user agent string.
       *
       * @param {!string} uastring userAgent string.
       * @param {!string} expr Regular expression used as match criteria.
       * @param {!number} pos position in the version string to be returned.
       * @return {!number} browser version.
       */
      function extractVersion(uastring, expr, pos) {
        var match = uastring.match(expr);
        return match && match.length >= pos && parseInt(match[pos], 10);
      }

      // Wraps the peerconnection event eventNameToWrap in a function
      // which returns the modified event object.
      function wrapPeerConnectionEvent(window, eventNameToWrap, wrapper) {
        if (!window.RTCPeerConnection) {
          return;
        }
        var proto = window.RTCPeerConnection.prototype;
        var nativeAddEventListener = proto.addEventListener;
        proto.addEventListener = function (nativeEventName, cb) {
          if (nativeEventName !== eventNameToWrap) {
            return nativeAddEventListener.apply(this, arguments);
          }
          var wrappedCallback = function wrappedCallback(e) {
            cb(wrapper(e));
          };
          this._eventMap = this._eventMap || {};
          this._eventMap[cb] = wrappedCallback;
          return nativeAddEventListener.apply(this, [nativeEventName, wrappedCallback]);
        };

        var nativeRemoveEventListener = proto.removeEventListener;
        proto.removeEventListener = function (nativeEventName, cb) {
          if (nativeEventName !== eventNameToWrap || !this._eventMap || !this._eventMap[cb]) {
            return nativeRemoveEventListener.apply(this, arguments);
          }
          var unwrappedCb = this._eventMap[cb];
          delete this._eventMap[cb];
          return nativeRemoveEventListener.apply(this, [nativeEventName, unwrappedCb]);
        };

        Object.defineProperty(proto, 'on' + eventNameToWrap, {
          get: function get() {
            return this['_on' + eventNameToWrap];
          },
          set: function set(cb) {
            if (this['_on' + eventNameToWrap]) {
              this.removeEventListener(eventNameToWrap, this['_on' + eventNameToWrap]);
              delete this['_on' + eventNameToWrap];
            }
            if (cb) {
              this.addEventListener(eventNameToWrap, this['_on' + eventNameToWrap] = cb);
            }
          }
        });
      }

      // Utility methods.
      module.exports = {
        extractVersion: extractVersion,
        wrapPeerConnectionEvent: wrapPeerConnectionEvent,
        disableLog: function disableLog(bool) {
          if (typeof bool !== 'boolean') {
            return new Error('Argument type: ' + (typeof bool === "undefined" ? "undefined" : _typeof(bool)) + '. Please use a boolean.');
          }
          logDisabled_ = bool;
          return bool ? 'adapter.js logging disabled' : 'adapter.js logging enabled';
        },

        /**
         * Disable or enable deprecation warnings
         * @param {!boolean} bool set to true to disable warnings.
         */
        disableWarnings: function disableWarnings(bool) {
          if (typeof bool !== 'boolean') {
            return new Error('Argument type: ' + (typeof bool === "undefined" ? "undefined" : _typeof(bool)) + '. Please use a boolean.');
          }
          deprecationWarnings_ = !bool;
          return 'adapter.js deprecation warnings ' + (bool ? 'disabled' : 'enabled');
        },

        log: function log() {
          if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object') {
            if (logDisabled_) {
              return;
            }
            if (typeof console !== 'undefined' && typeof console.log === 'function') {
              console.log.apply(console, arguments);
            }
          }
        },

        /**
         * Shows a deprecation warning suggesting the modern and spec-compatible API.
         */
        deprecated: function deprecated(oldMethod, newMethod) {
          if (!deprecationWarnings_) {
            return;
          }
          console.warn(oldMethod + ' is deprecated, please use ' + newMethod + ' instead.');
        },

        /**
         * Browser detector.
         *
         * @return {object} result containing browser and version
         *     properties.
         */
        detectBrowser: function detectBrowser(window) {
          var navigator = window && window.navigator;

          // Returned result object.
          var result = {};
          result.browser = null;
          result.version = null;

          // Fail early if it's not a browser
          if (typeof window === 'undefined' || !window.navigator) {
            result.browser = 'Not a browser.';
            return result;
          }

          if (navigator.mozGetUserMedia) {
            // Firefox.
            result.browser = 'firefox';
            result.version = extractVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1);
          } else if (navigator.webkitGetUserMedia) {
            // Chrome, Chromium, Webview, Opera.
            // Version matches Chrome/WebRTC version.
            result.browser = 'chrome';
            result.version = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2);
          } else if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
            // Edge.
            result.browser = 'edge';
            result.version = extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2);
          } else if (window.RTCPeerConnection && navigator.userAgent.match(/AppleWebKit\/(\d+)\./)) {
            // Safari.
            result.browser = 'safari';
            result.version = extractVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1);
          } else {
            // Default fallthrough: not supported.
            result.browser = 'Not a supported browser.';
            return result;
          }

          return result;
        }
      };
    }, {}] }, {}, [3])(3);
});
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ })

}]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9zcmMvanMvYXBpL3Byb3ZpZGVyL2h0bWw1L1dlYlJUQy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvanMvYXBpL3Byb3ZpZGVyL2h0bWw1L1dlYlJUQ0xvYWRlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvanMvdXRpbHMvYWRhcHRlci5qcyJdLCJuYW1lcyI6WyJXZWJSVEMiLCJjb250YWluZXIiLCJwbGF5ZXJDb25maWciLCJtZWRpYU1hbmFnZXIiLCJQUk9WSURFUl9XRUJSVEMiLCJlbGVtZW50IiwiY3JlYXRlIiwid2VicnRjTG9hZGVyIiwidGhhdCIsInN1cGVyX2Rlc3Ryb3kiLCJsaXN0ZW5lciIsImVycm9ySGFuZGxlciIsImVycm9yIiwic2V0U3RhdGUiLCJTVEFURV9FUlJPUiIsInBhdXNlIiwidHJpZ2dlciIsIkVSUk9SIiwib25CZWZvcmVMb2FkIiwic291cmNlIiwiZmlsZSIsInR5cGUiLCJPdmVuUGxheWVyQ29uc29sZSIsImxvZyIsImRlc3Ryb3kiLCJjb25uZWN0IiwidGhlbiIsInN0cmVhbSIsInNyY09iamVjdCIsInBsYXkiLCJzdXBlciIsIldlYlJUQ0xvYWRlciIsInByb3ZpZGVyIiwidXJsIiwiZXJyb3JDYWxsYmFjayIsIndzIiwicGVlckNvbm5lY3Rpb24iLCJzdGF0aXN0aWNzVGltZXIiLCJjb25maWciLCJteVNkcCIsImV4aXN0aW5nSGFuZGxlciIsIndpbmRvdyIsIm9uYmVmb3JldW5sb2FkIiwiZXZlbnQiLCJjbG9zZVBlZXIiLCJpbml0aWFsaXplIiwib25Mb2NhbERlc2NyaXB0aW9uIiwiaWQiLCJjb25uZWN0aW9uIiwiZGVzYyIsInNldExvY2FsRGVzY3JpcHRpb24iLCJsb2NhbFNEUCIsImxvY2FsRGVzY3JpcHRpb24iLCJzZW5kIiwiSlNPTiIsInN0cmluZ2lmeSIsImNvbW1hbmQiLCJzZHAiLCJjYXRjaCIsImNvZGUiLCJQTEFZRVJfV0VCUlRDX1NFVF9MT0NBTF9ERVNDX0VSUk9SIiwicmVhc29uIiwibWVzc2FnZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiV2ViU29ja2V0Iiwib25vcGVuIiwib25tZXNzYWdlIiwiZSIsInBhcnNlIiwiZGF0YSIsIlBMQVlFUl9XRUJSVENfV1NfRVJST1IiLCJsaXN0IiwiUlRDUGVlckNvbm5lY3Rpb24iLCJvbmljZWNhbmRpZGF0ZSIsImNhbmRpZGF0ZSIsImNhbmRpZGF0ZXMiLCJvbm5lZ290aWF0aW9ubmVlZGVkIiwiY3JlYXRlT2ZmZXIiLCJlcnIiLCJQTEFZRVJfV0VCUlRDX0NSRUFURV9BTlNXRVJfRVJST1IiLCJvbmFkZHN0cmVhbSIsImxvc3RQYWNrZXRzQXJyIiwic2xvdExlbmd0aCIsInByZXZQYWNrZXRzTG9zdCIsImF2ZzhMb3NzZXMiLCJhdmdNb3JlVGhhblRocmVzaG9sZENvdW50IiwidGhyZXNob2xkIiwiZXh0cmFjdExvc3NQYWNrZXRzT25OZXR3b3JrU3RhdHVzIiwic2V0VGltZW91dCIsImdldFN0YXRzIiwic3RhdHMiLCJmb3JFYWNoIiwic3RhdGUiLCJpc1JlbW90ZSIsInB1c2giLCJwYXJzZUludCIsInBhY2tldHNMb3N0IiwibGVuZ3RoIiwic2xpY2UiLCJfIiwicmVkdWNlIiwibWVtbyIsIm51bSIsImNsZWFyVGltZW91dCIsIk5FVFdPUktfVU5TVEFCTEVEIiwic2V0UmVtb3RlRGVzY3JpcHRpb24iLCJSVENTZXNzaW9uRGVzY3JpcHRpb24iLCJyZW1vdGVEZXNjcmlwdGlvbiIsImNyZWF0ZUFuc3dlciIsIlBMQVlFUl9XRUJSVENfU0VUX1JFTU9URV9ERVNDX0VSUk9SIiwiaSIsImFkZEljZUNhbmRpZGF0ZSIsIlJUQ0ljZUNhbmRpZGF0ZSIsIlBMQVlFUl9XRUJSVENfQUREX0lDRUNBTkRJREFURV9FUlJPUiIsIm9uZXJyb3IiLCJjbG9zZSIsImYiLCJleHBvcnRzIiwibW9kdWxlIiwiZGVmaW5lIiwidCIsIm4iLCJyIiwicyIsIm8iLCJ1IiwiYSIsInJlcXVpcmUiLCJFcnJvciIsImwiLCJjYWxsIiwiU0RQVXRpbHMiLCJ3cml0ZU1lZGlhU2VjdGlvbiIsInRyYW5zY2VpdmVyIiwiY2FwcyIsImR0bHNSb2xlIiwid3JpdGVSdHBEZXNjcmlwdGlvbiIsImtpbmQiLCJ3cml0ZUljZVBhcmFtZXRlcnMiLCJpY2VHYXRoZXJlciIsImdldExvY2FsUGFyYW1ldGVycyIsIndyaXRlRHRsc1BhcmFtZXRlcnMiLCJkdGxzVHJhbnNwb3J0IiwibWlkIiwicnRwU2VuZGVyIiwicnRwUmVjZWl2ZXIiLCJ0cmFja0lkIiwiX2luaXRpYWxUcmFja0lkIiwidHJhY2siLCJtc2lkIiwic2VuZEVuY29kaW5nUGFyYW1ldGVycyIsInNzcmMiLCJydHgiLCJsb2NhbENOYW1lIiwiZmlsdGVySWNlU2VydmVycyIsImljZVNlcnZlcnMiLCJlZGdlVmVyc2lvbiIsImhhc1R1cm4iLCJmaWx0ZXIiLCJzZXJ2ZXIiLCJ1cmxzIiwiY29uc29sZSIsIndhcm4iLCJpc1N0cmluZyIsInZhbGlkVHVybiIsImluZGV4T2YiLCJnZXRDb21tb25DYXBhYmlsaXRpZXMiLCJsb2NhbENhcGFiaWxpdGllcyIsInJlbW90ZUNhcGFiaWxpdGllcyIsImNvbW1vbkNhcGFiaWxpdGllcyIsImNvZGVjcyIsImhlYWRlckV4dGVuc2lvbnMiLCJmZWNNZWNoYW5pc21zIiwiZmluZENvZGVjQnlQYXlsb2FkVHlwZSIsInB0IiwicGF5bG9hZFR5cGUiLCJwcmVmZXJyZWRQYXlsb2FkVHlwZSIsInJ0eENhcGFiaWxpdHlNYXRjaGVzIiwibFJ0eCIsInJSdHgiLCJsQ29kZWNzIiwickNvZGVjcyIsImxDb2RlYyIsInBhcmFtZXRlcnMiLCJhcHQiLCJyQ29kZWMiLCJuYW1lIiwidG9Mb3dlckNhc2UiLCJjbG9ja1JhdGUiLCJudW1DaGFubmVscyIsIk1hdGgiLCJtaW4iLCJydGNwRmVlZGJhY2siLCJmYiIsImoiLCJwYXJhbWV0ZXIiLCJsSGVhZGVyRXh0ZW5zaW9uIiwickhlYWRlckV4dGVuc2lvbiIsInVyaSIsImlzQWN0aW9uQWxsb3dlZEluU2lnbmFsaW5nU3RhdGUiLCJhY3Rpb24iLCJzaWduYWxpbmdTdGF0ZSIsIm9mZmVyIiwiYW5zd2VyIiwibWF5YmVBZGRDYW5kaWRhdGUiLCJpY2VUcmFuc3BvcnQiLCJhbHJlYWR5QWRkZWQiLCJnZXRSZW1vdGVDYW5kaWRhdGVzIiwiZmluZCIsInJlbW90ZUNhbmRpZGF0ZSIsImZvdW5kYXRpb24iLCJpcCIsInBvcnQiLCJwcmlvcml0eSIsInByb3RvY29sIiwiYWRkUmVtb3RlQ2FuZGlkYXRlIiwibWFrZUVycm9yIiwiZGVzY3JpcHRpb24iLCJOb3RTdXBwb3J0ZWRFcnJvciIsIkludmFsaWRTdGF0ZUVycm9yIiwiSW52YWxpZEFjY2Vzc0Vycm9yIiwiVHlwZUVycm9yIiwidW5kZWZpbmVkIiwiT3BlcmF0aW9uRXJyb3IiLCJhZGRUcmFja1RvU3RyZWFtQW5kRmlyZUV2ZW50IiwiYWRkVHJhY2siLCJkaXNwYXRjaEV2ZW50IiwiTWVkaWFTdHJlYW1UcmFja0V2ZW50IiwicmVtb3ZlVHJhY2tGcm9tU3RyZWFtQW5kRmlyZUV2ZW50IiwicmVtb3ZlVHJhY2siLCJmaXJlQWRkVHJhY2siLCJwYyIsInJlY2VpdmVyIiwic3RyZWFtcyIsInRyYWNrRXZlbnQiLCJFdmVudCIsIl9kaXNwYXRjaEV2ZW50IiwiX2V2ZW50VGFyZ2V0IiwiZG9jdW1lbnQiLCJjcmVhdGVEb2N1bWVudEZyYWdtZW50IiwibWV0aG9kIiwiYmluZCIsImNhblRyaWNrbGVJY2VDYW5kaWRhdGVzIiwibmVlZE5lZ290aWF0aW9uIiwibG9jYWxTdHJlYW1zIiwicmVtb3RlU3RyZWFtcyIsImljZUNvbm5lY3Rpb25TdGF0ZSIsImNvbm5lY3Rpb25TdGF0ZSIsImljZUdhdGhlcmluZ1N0YXRlIiwidXNpbmdCdW5kbGUiLCJidW5kbGVQb2xpY3kiLCJydGNwTXV4UG9saWN5IiwiaWNlVHJhbnNwb3J0UG9saWN5IiwiX2ljZUdhdGhlcmVycyIsImljZUNhbmRpZGF0ZVBvb2xTaXplIiwiUlRDSWNlR2F0aGVyZXIiLCJnYXRoZXJQb2xpY3kiLCJfY29uZmlnIiwidHJhbnNjZWl2ZXJzIiwiX3NkcFNlc3Npb25JZCIsImdlbmVyYXRlU2Vzc2lvbklkIiwiX3NkcFNlc3Npb25WZXJzaW9uIiwiX2R0bHNSb2xlIiwiX2lzQ2xvc2VkIiwicHJvdG90eXBlIiwib250cmFjayIsIm9ucmVtb3Zlc3RyZWFtIiwib25zaWduYWxpbmdzdGF0ZWNoYW5nZSIsIm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlIiwib25jb25uZWN0aW9uc3RhdGVjaGFuZ2UiLCJvbmljZWdhdGhlcmluZ3N0YXRlY2hhbmdlIiwib25kYXRhY2hhbm5lbCIsIl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UiLCJnZXRDb25maWd1cmF0aW9uIiwiZ2V0TG9jYWxTdHJlYW1zIiwiZ2V0UmVtb3RlU3RyZWFtcyIsIl9jcmVhdGVUcmFuc2NlaXZlciIsImRvTm90QWRkIiwiaGFzQnVuZGxlVHJhbnNwb3J0IiwicmVjdkVuY29kaW5nUGFyYW1ldGVycyIsImFzc29jaWF0ZWRSZW1vdGVNZWRpYVN0cmVhbXMiLCJ3YW50UmVjZWl2ZSIsInRyYW5zcG9ydHMiLCJfY3JlYXRlSWNlQW5kRHRsc1RyYW5zcG9ydHMiLCJhbHJlYWR5RXhpc3RzIiwiX21heWJlRmlyZU5lZ290aWF0aW9uTmVlZGVkIiwiUlRDUnRwU2VuZGVyIiwiYWRkU3RyZWFtIiwiZ2V0VHJhY2tzIiwiY2xvbmVkU3RyZWFtIiwiY2xvbmUiLCJpZHgiLCJjbG9uZWRUcmFjayIsImFkZEV2ZW50TGlzdGVuZXIiLCJlbmFibGVkIiwic2VuZGVyIiwic3RvcCIsIm1hcCIsInNwbGljZSIsInJlbW92ZVN0cmVhbSIsImdldFNlbmRlcnMiLCJnZXRSZWNlaXZlcnMiLCJfY3JlYXRlSWNlR2F0aGVyZXIiLCJzZHBNTGluZUluZGV4Iiwic2hpZnQiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsInZhbHVlIiwid3JpdGFibGUiLCJidWZmZXJlZENhbmRpZGF0ZUV2ZW50cyIsImJ1ZmZlckNhbmRpZGF0ZXMiLCJlbmQiLCJrZXlzIiwiX2dhdGhlciIsIm9ubG9jYWxjYW5kaWRhdGUiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiZXZ0Iiwic2RwTWlkIiwiY2FuZCIsImNvbXBvbmVudCIsInVmcmFnIiwidXNlcm5hbWVGcmFnbWVudCIsInNlcmlhbGl6ZWRDYW5kaWRhdGUiLCJ3cml0ZUNhbmRpZGF0ZSIsInBhcnNlQ2FuZGlkYXRlIiwidG9KU09OIiwic2VjdGlvbnMiLCJnZXRNZWRpYVNlY3Rpb25zIiwiZ2V0RGVzY3JpcHRpb24iLCJqb2luIiwiY29tcGxldGUiLCJldmVyeSIsIlJUQ0ljZVRyYW5zcG9ydCIsIm9uaWNlc3RhdGVjaGFuZ2UiLCJfdXBkYXRlSWNlQ29ubmVjdGlvblN0YXRlIiwiX3VwZGF0ZUNvbm5lY3Rpb25TdGF0ZSIsIlJUQ0R0bHNUcmFuc3BvcnQiLCJvbmR0bHNzdGF0ZWNoYW5nZSIsIl9kaXNwb3NlSWNlQW5kRHRsc1RyYW5zcG9ydHMiLCJfdHJhbnNjZWl2ZSIsInJlY3YiLCJwYXJhbXMiLCJlbmNvZGluZ3MiLCJydGNwIiwiY25hbWUiLCJjb21wb3VuZCIsInJ0Y3BQYXJhbWV0ZXJzIiwicCIsInJlY2VpdmUiLCJzZXNzaW9ucGFydCIsInNwbGl0U2VjdGlvbnMiLCJtZWRpYVNlY3Rpb24iLCJwYXJzZVJ0cFBhcmFtZXRlcnMiLCJpc0ljZUxpdGUiLCJtYXRjaFByZWZpeCIsInJlamVjdGVkIiwiaXNSZWplY3RlZCIsInJlbW90ZUljZVBhcmFtZXRlcnMiLCJnZXRJY2VQYXJhbWV0ZXJzIiwicmVtb3RlRHRsc1BhcmFtZXRlcnMiLCJnZXREdGxzUGFyYW1ldGVycyIsInJvbGUiLCJzdGFydCIsIl91cGRhdGVTaWduYWxpbmdTdGF0ZSIsInJlY2VpdmVyTGlzdCIsImljZU9wdGlvbnMiLCJzdWJzdHIiLCJzcGxpdCIsImxpbmVzIiwic3BsaXRMaW5lcyIsImdldEtpbmQiLCJkaXJlY3Rpb24iLCJnZXREaXJlY3Rpb24iLCJyZW1vdGVNc2lkIiwicGFyc2VNc2lkIiwiZ2V0TWlkIiwiZ2VuZXJhdGVJZGVudGlmaWVyIiwicGFyc2VSdHBFbmNvZGluZ1BhcmFtZXRlcnMiLCJwYXJzZVJ0Y3BQYXJhbWV0ZXJzIiwiaXNDb21wbGV0ZSIsImNhbmRzIiwic2V0VHJhbnNwb3J0Iiwic2V0UmVtb3RlQ2FuZGlkYXRlcyIsIlJUQ1J0cFJlY2VpdmVyIiwiZ2V0Q2FwYWJpbGl0aWVzIiwiY29kZWMiLCJpc05ld1RyYWNrIiwiTWVkaWFTdHJlYW0iLCJnZXQiLCJkZWZhdWx0IiwibmF0aXZlVHJhY2siLCJzaWQiLCJpdGVtIiwibmV3U3RhdGUiLCJzdGF0ZXMiLCJjbG9zZWQiLCJjaGVja2luZyIsImNvbm5lY3RlZCIsImNvbXBsZXRlZCIsImRpc2Nvbm5lY3RlZCIsImZhaWxlZCIsIm5ldyIsImNvbm5lY3RpbmciLCJudW1BdWRpb1RyYWNrcyIsIm51bVZpZGVvVHJhY2tzIiwib2ZmZXJPcHRpb25zIiwiYXJndW1lbnRzIiwibWFuZGF0b3J5Iiwib3B0aW9uYWwiLCJvZmZlclRvUmVjZWl2ZUF1ZGlvIiwib2ZmZXJUb1JlY2VpdmVWaWRlbyIsIndyaXRlU2Vzc2lvbkJvaWxlcnBsYXRlIiwicmVtb3RlQ29kZWMiLCJoZHJFeHQiLCJyZW1vdGVFeHRlbnNpb25zIiwickhkckV4dCIsImdldExvY2FsQ2FuZGlkYXRlcyIsIm1lZGlhU2VjdGlvbnNJbk9mZmVyIiwibG9jYWxUcmFjayIsImdldEF1ZGlvVHJhY2tzIiwiZ2V0VmlkZW9UcmFja3MiLCJoYXNSdHgiLCJjIiwicmVkdWNlZFNpemUiLCJjYW5kaWRhdGVTdHJpbmciLCJ0cmltIiwicHJvbWlzZXMiLCJmaXhTdGF0c1R5cGUiLCJzdGF0IiwiaW5ib3VuZHJ0cCIsIm91dGJvdW5kcnRwIiwiY2FuZGlkYXRlcGFpciIsImxvY2FsY2FuZGlkYXRlIiwicmVtb3RlY2FuZGlkYXRlIiwicmVzdWx0cyIsIk1hcCIsImFsbCIsInJlcyIsInJlc3VsdCIsInNldCIsIm1ldGhvZHMiLCJuYXRpdmVNZXRob2QiLCJhcmdzIiwiYXBwbHkiLCJyYW5kb20iLCJ0b1N0cmluZyIsImJsb2IiLCJsaW5lIiwicGFydHMiLCJwYXJ0IiwiaW5kZXgiLCJwcmVmaXgiLCJzdWJzdHJpbmciLCJyZWxhdGVkQWRkcmVzcyIsInJlbGF0ZWRQb3J0IiwidGNwVHlwZSIsInRvVXBwZXJDYXNlIiwicGFyc2VJY2VPcHRpb25zIiwicGFyc2VSdHBNYXAiLCJwYXJzZWQiLCJ3cml0ZVJ0cE1hcCIsInBhcnNlRXh0bWFwIiwid3JpdGVFeHRtYXAiLCJoZWFkZXJFeHRlbnNpb24iLCJwcmVmZXJyZWRJZCIsInBhcnNlRm10cCIsImt2Iiwid3JpdGVGbXRwIiwicGFyYW0iLCJwYXJzZVJ0Y3BGYiIsIndyaXRlUnRjcEZiIiwicGFyc2VTc3JjTWVkaWEiLCJzcCIsImNvbG9uIiwiYXR0cmlidXRlIiwicGFyc2VGaW5nZXJwcmludCIsImFsZ29yaXRobSIsImZpbmdlcnByaW50cyIsInNldHVwVHlwZSIsImZwIiwiY29uY2F0IiwiaWNlUGFyYW1ldGVycyIsInBhc3N3b3JkIiwibWxpbmUiLCJydHBtYXBsaW5lIiwiZm10cHMiLCJtYXhwdGltZSIsImV4dGVuc2lvbiIsImVuY29kaW5nUGFyYW1ldGVycyIsImhhc1JlZCIsImhhc1VscGZlYyIsInNzcmNzIiwicHJpbWFyeVNzcmMiLCJzZWNvbmRhcnlTc3JjIiwiZmxvd3MiLCJlbmNQYXJhbSIsImNvZGVjUGF5bG9hZFR5cGUiLCJmZWMiLCJtZWNoYW5pc20iLCJiYW5kd2lkdGgiLCJtYXhCaXRyYXRlIiwicmVtb3RlU3NyYyIsIm9iaiIsInJzaXplIiwibXV4Iiwic3BlYyIsInBsYW5CIiwic2Vzc0lkIiwic2Vzc1ZlciIsInNlc3Npb25JZCIsInZlcnNpb24iLCJwYXJzZU1MaW5lIiwiZm10IiwicGFyc2VPTGluZSIsInVzZXJuYW1lIiwic2Vzc2lvblZlcnNpb24iLCJuZXRUeXBlIiwiYWRkcmVzc1R5cGUiLCJhZGRyZXNzIiwiZ2xvYmFsIiwiYWRhcHRlckZhY3RvcnkiLCJzZWxmIiwidXRpbHMiLCJkZXBlbmRlbmNpZXMiLCJvcHRzIiwib3B0aW9ucyIsInNoaW1DaHJvbWUiLCJzaGltRmlyZWZveCIsInNoaW1FZGdlIiwic2hpbVNhZmFyaSIsImtleSIsImhhc093blByb3BlcnR5IiwibG9nZ2luZyIsImJyb3dzZXJEZXRhaWxzIiwiZGV0ZWN0QnJvd3NlciIsImNocm9tZVNoaW0iLCJlZGdlU2hpbSIsImZpcmVmb3hTaGltIiwic2FmYXJpU2hpbSIsImNvbW1vblNoaW0iLCJhZGFwdGVyIiwiZXh0cmFjdFZlcnNpb24iLCJkaXNhYmxlTG9nIiwiZGlzYWJsZVdhcm5pbmdzIiwiYnJvd3NlciIsInNoaW1QZWVyQ29ubmVjdGlvbiIsImJyb3dzZXJTaGltIiwic2hpbUNyZWF0ZU9iamVjdFVSTCIsInNoaW1HZXRVc2VyTWVkaWEiLCJzaGltTWVkaWFTdHJlYW0iLCJzaGltU291cmNlT2JqZWN0Iiwic2hpbU9uVHJhY2siLCJzaGltQWRkVHJhY2tSZW1vdmVUcmFjayIsInNoaW1HZXRTZW5kZXJzV2l0aER0bWYiLCJzaGltUlRDSWNlQ2FuZGlkYXRlIiwic2hpbU1heE1lc3NhZ2VTaXplIiwic2hpbVNlbmRUaHJvd1R5cGVFcnJvciIsInNoaW1SZW1vdmVTdHJlYW0iLCJzaGltUmVwbGFjZVRyYWNrIiwic2hpbVJUQ0ljZVNlcnZlclVybHMiLCJzaGltQ2FsbGJhY2tzQVBJIiwic2hpbUxvY2FsU3RyZWFtc0FQSSIsInNoaW1SZW1vdGVTdHJlYW1zQVBJIiwic2hpbVRyYWNrRXZlbnRUcmFuc2NlaXZlciIsInNoaW1DcmVhdGVPZmZlckxlZ2FjeSIsIndlYmtpdE1lZGlhU3RyZWFtIiwiX29udHJhY2siLCJvcmlnU2V0UmVtb3RlRGVzY3JpcHRpb24iLCJfb250cmFja3BvbHkiLCJ0ZSIsIndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50Iiwic2hpbVNlbmRlcldpdGhEdG1mIiwiZHRtZiIsIl9kdG1mIiwiY3JlYXRlRFRNRlNlbmRlciIsIl9wYyIsIl9zZW5kZXJzIiwib3JpZ0FkZFRyYWNrIiwib3JpZ1JlbW92ZVRyYWNrIiwib3JpZ0FkZFN0cmVhbSIsIm9yaWdSZW1vdmVTdHJlYW0iLCJvcmlnR2V0U2VuZGVycyIsInNlbmRlcnMiLCJVUkwiLCJIVE1MTWVkaWFFbGVtZW50IiwiX3NyY09iamVjdCIsInNyYyIsInJldm9rZU9iamVjdFVSTCIsImNyZWF0ZU9iamVjdFVSTCIsInNoaW1BZGRUcmFja1JlbW92ZVRyYWNrV2l0aE5hdGl2ZSIsIl9zaGltbWVkTG9jYWxTdHJlYW1zIiwic3RyZWFtSWQiLCJET01FeGNlcHRpb24iLCJleGlzdGluZ1NlbmRlcnMiLCJuZXdTZW5kZXJzIiwibmV3U2VuZGVyIiwib3JpZ0dldExvY2FsU3RyZWFtcyIsIm5hdGl2ZVN0cmVhbXMiLCJfcmV2ZXJzZVN0cmVhbXMiLCJfc3RyZWFtcyIsIm5ld1N0cmVhbSIsIm9sZFN0cmVhbSIsInJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkIiwiaW50ZXJuYWxJZCIsImV4dGVybmFsU3RyZWFtIiwiaW50ZXJuYWxTdHJlYW0iLCJyZXBsYWNlIiwiUmVnRXhwIiwicmVwbGFjZUV4dGVybmFsU3RyZWFtSWQiLCJpc0xlZ2FjeUNhbGwiLCJvcmlnU2V0TG9jYWxEZXNjcmlwdGlvbiIsIm9yaWdMb2NhbERlc2NyaXB0aW9uIiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiaXNMb2NhbCIsInN0cmVhbWlkIiwiaGFzVHJhY2siLCJ3ZWJraXRSVENQZWVyQ29ubmVjdGlvbiIsInBjQ29uZmlnIiwicGNDb25zdHJhaW50cyIsImljZVRyYW5zcG9ydHMiLCJnZW5lcmF0ZUNlcnRpZmljYXRlIiwiT3JpZ1BlZXJDb25uZWN0aW9uIiwibmV3SWNlU2VydmVycyIsImRlcHJlY2F0ZWQiLCJvcmlnR2V0U3RhdHMiLCJzZWxlY3RvciIsInN1Y2Nlc3NDYWxsYmFjayIsImZpeENocm9tZVN0YXRzXyIsInJlc3BvbnNlIiwic3RhbmRhcmRSZXBvcnQiLCJyZXBvcnRzIiwicmVwb3J0Iiwic3RhbmRhcmRTdGF0cyIsInRpbWVzdGFtcCIsIm5hbWVzIiwibWFrZU1hcFN0YXRzIiwic3VjY2Vzc0NhbGxiYWNrV3JhcHBlcl8iLCJwcm9taXNlIiwibmF0aXZlQWRkSWNlQ2FuZGlkYXRlIiwibmF2aWdhdG9yIiwiY29uc3RyYWludHNUb0Nocm9tZV8iLCJjYyIsImlkZWFsIiwiZXhhY3QiLCJtYXgiLCJvbGRuYW1lXyIsImNoYXJBdCIsIm9jIiwibWl4IiwiYWR2YW5jZWQiLCJzaGltQ29uc3RyYWludHNfIiwiY29uc3RyYWludHMiLCJmdW5jIiwiYXVkaW8iLCJyZW1hcCIsImIiLCJ2aWRlbyIsImZhY2UiLCJmYWNpbmdNb2RlIiwiZ2V0U3VwcG9ydGVkRmFjaW5nTW9kZUxpZXMiLCJtZWRpYURldmljZXMiLCJnZXRTdXBwb3J0ZWRDb25zdHJhaW50cyIsIm1hdGNoZXMiLCJlbnVtZXJhdGVEZXZpY2VzIiwiZGV2aWNlcyIsImQiLCJkZXYiLCJzb21lIiwibWF0Y2giLCJsYWJlbCIsImRldmljZUlkIiwic2hpbUVycm9yXyIsIlBlcm1pc3Npb25EZW5pZWRFcnJvciIsIlBlcm1pc3Npb25EaXNtaXNzZWRFcnJvciIsIkRldmljZXNOb3RGb3VuZEVycm9yIiwiQ29uc3RyYWludE5vdFNhdGlzZmllZEVycm9yIiwiVHJhY2tTdGFydEVycm9yIiwiTWVkaWFEZXZpY2VGYWlsZWREdWVUb1NodXRkb3duIiwiTWVkaWFEZXZpY2VLaWxsU3dpdGNoT24iLCJUYWJDYXB0dXJlRXJyb3IiLCJTY3JlZW5DYXB0dXJlRXJyb3IiLCJEZXZpY2VDYXB0dXJlRXJyb3IiLCJjb25zdHJhaW50IiwiY29uc3RyYWludE5hbWUiLCJnZXRVc2VyTWVkaWFfIiwib25TdWNjZXNzIiwib25FcnJvciIsIndlYmtpdEdldFVzZXJNZWRpYSIsImdldFVzZXJNZWRpYSIsImdldFVzZXJNZWRpYVByb21pc2VfIiwia2luZHMiLCJNZWRpYVN0cmVhbVRyYWNrIiwiZ2V0U291cmNlcyIsImRldmljZSIsImdyb3VwSWQiLCJlY2hvQ2FuY2VsbGF0aW9uIiwiZnJhbWVSYXRlIiwiaGVpZ2h0Iiwid2lkdGgiLCJvcmlnR2V0VXNlck1lZGlhIiwiY3MiLCJOYXRpdmVSVENJY2VDYW5kaWRhdGUiLCJuYXRpdmVDYW5kaWRhdGUiLCJwYXJzZWRDYW5kaWRhdGUiLCJhdWdtZW50ZWRDYW5kaWRhdGUiLCJuYXRpdmVDcmVhdGVPYmplY3RVUkwiLCJuYXRpdmVSZXZva2VPYmplY3RVUkwiLCJuZXdJZCIsImRlbGV0ZSIsImRzYyIsIm5hdGl2ZVNldEF0dHJpYnV0ZSIsInNldEF0dHJpYnV0ZSIsIlJUQ1NjdHBUcmFuc3BvcnQiLCJfc2N0cCIsInNjdHBJbkRlc2NyaXB0aW9uIiwibUxpbmUiLCJnZXRSZW1vdGVGaXJlZm94VmVyc2lvbiIsImdldENhblNlbmRNYXhNZXNzYWdlU2l6ZSIsInJlbW90ZUlzRmlyZWZveCIsImNhblNlbmRNYXhNZXNzYWdlU2l6ZSIsImdldE1heE1lc3NhZ2VTaXplIiwibWF4TWVzc2FnZVNpemUiLCJpc0ZpcmVmb3giLCJjYW5TZW5kTU1TIiwicmVtb3RlTU1TIiwiTnVtYmVyIiwiUE9TSVRJVkVfSU5GSU5JVFkiLCJzY3RwIiwib3JpZ0NyZWF0ZURhdGFDaGFubmVsIiwiY3JlYXRlRGF0YUNoYW5uZWwiLCJkYXRhQ2hhbm5lbCIsIm9yaWdEYXRhQ2hhbm5lbFNlbmQiLCJkYyIsInNpemUiLCJieXRlTGVuZ3RoIiwic2hpbVJUQ1BlZXJDb25uZWN0aW9uIiwib3JpZ01TVEVuYWJsZWQiLCJldiIsIlJUQ0R0bWZTZW5kZXIiLCJSVENEVE1GU2VuZGVyIiwicmVwbGFjZVRyYWNrIiwic2V0VHJhY2siLCJSVENUcmFja0V2ZW50IiwibW96U3JjT2JqZWN0IiwibW96UlRDUGVlckNvbm5lY3Rpb24iLCJuZXdTZXJ2ZXIiLCJjcmVkZW50aWFsIiwibW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uIiwibW96UlRDSWNlQ2FuZGlkYXRlIiwibW9kZXJuU3RhdHNUeXBlcyIsIm5hdGl2ZUdldFN0YXRzIiwib25TdWNjIiwib25FcnIiLCJJbnRlcm5hbEVycm9yIiwiU2VjdXJpdHlFcnJvciIsImNvbnN0cmFpbnRzVG9GRjM3XyIsIm1vekdldFVzZXJNZWRpYSIsImluZm9zIiwib3JnRW51bWVyYXRlRGV2aWNlcyIsIm5hdGl2ZUdldFVzZXJNZWRpYSIsImdldFNldHRpbmdzIiwibmF0aXZlR2V0U2V0dGluZ3MiLCJhcHBseUNvbnN0cmFpbnRzIiwibmF0aXZlQXBwbHlDb25zdHJhaW50cyIsIl9sb2NhbFN0cmVhbXMiLCJnZXRTdHJlYW1CeUlkIiwiX3JlbW90ZVN0cmVhbXMiLCJfYWRkVHJhY2siLCJ0cmFja3MiLCJfb25hZGRzdHJlYW0iLCJfb25hZGRzdHJlYW1wb2x5IiwiZmFpbHVyZUNhbGxiYWNrIiwid2l0aENhbGxiYWNrIiwiY2IiLCJlcnJjYiIsIlJUQ1RyYW5zY2VpdmVyIiwib3JpZ0NyZWF0ZU9mZmVyIiwiYXVkaW9UcmFuc2NlaXZlciIsImdldFRyYW5zY2VpdmVycyIsInNldERpcmVjdGlvbiIsImFkZFRyYW5zY2VpdmVyIiwidmlkZW9UcmFuc2NlaXZlciIsImxvZ0Rpc2FibGVkXyIsImRlcHJlY2F0aW9uV2FybmluZ3NfIiwidWFzdHJpbmciLCJleHByIiwicG9zIiwiZXZlbnROYW1lVG9XcmFwIiwid3JhcHBlciIsInByb3RvIiwibmF0aXZlQWRkRXZlbnRMaXN0ZW5lciIsIm5hdGl2ZUV2ZW50TmFtZSIsIndyYXBwZWRDYWxsYmFjayIsIl9ldmVudE1hcCIsIm5hdGl2ZVJlbW92ZUV2ZW50TGlzdGVuZXIiLCJ1bndyYXBwZWRDYiIsImJvb2wiLCJvbGRNZXRob2QiLCJuZXdNZXRob2QiLCJ1c2VyQWdlbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUVBOzs7Ozs7QUFWQTs7O0FBZ0JBLElBQU1BLFNBQVMsU0FBVEEsTUFBUyxDQUFTQyxTQUFULEVBQW9CQyxZQUFwQixFQUFpQzs7QUFFNUMsUUFBSUMsZUFBZSx1QkFBYUYsU0FBYixFQUF3QkcsMEJBQXhCLENBQW5CO0FBQ0EsUUFBSUMsVUFBVUYsYUFBYUcsTUFBYixFQUFkOztBQUVBLFFBQUlDLGVB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K0IsZUFBZWtHLFVBQVVnSyxTQUF6QixFQUNiLHVCQURhLEVBQ1ksQ0FEWixDQUFqQjtBQUVELFdBTk0sTUFNQSxJQUFJaEssVUFBVXFCLFlBQVYsSUFDUHJCLFVBQVVnSyxTQUFWLENBQW9CbkksS0FBcEIsQ0FBMEIsb0JBQTFCLENBREcsRUFDOEM7QUFBRTtBQUNyRHRPLG1CQUFPMEcsT0FBUCxHQUFpQixNQUFqQjtBQUNBMUcsbUJBQU93RSxPQUFQLEdBQWlCK0IsZUFBZWtHLFVBQVVnSyxTQUF6QixFQUNiLG9CQURhLEVBQ1MsQ0FEVCxDQUFqQjtBQUVELFdBTE0sTUFLQSxJQUFJeHZCLE9BQU9pQyxpQkFBUCxJQUNQdWpCLFVBQVVnSyxTQUFWLENBQW9CbkksS0FBcEIsQ0FBMEIsc0JBQTFCLENBREcsRUFDZ0Q7QUFBRTtBQUN2RHRPLG1CQUFPMEcsT0FBUCxHQUFpQixRQUFqQjtBQUNBMUcsbUJBQU93RSxPQUFQLEdBQWlCK0IsZUFBZWtHLFVBQVVnSyxTQUF6QixFQUNiLHNCQURhLEVBQ1csQ0FEWCxDQUFqQjtBQUVELFdBTE0sTUFLQTtBQUFFO0FBQ1B6VyxtQkFBTzBHLE9BQVAsR0FBaUIsMEJBQWpCO0FBQ0EsbUJBQU8xRyxNQUFQO0FBQ0Q7O0FBRUQsaUJBQU9BLE1BQVA7QUFDRDtBQTlGYyxPQUFqQjtBQWlHQyxLQWhMcUIsRUFnTHBCLEVBaExvQixDQTlwSm94QixFQUEzYixFQTgwSnhXLEVBOTBKd1csRUE4MEpyVyxDQUFDLENBQUQsQ0E5MEpxVyxFQTgwSmhXLENBOTBKZ1csQ0FBUDtBQSswSnZXLENBLzBKRCxFIiwiZmlsZSI6Im92ZW5wbGF5ZXIucHJvdmlkZXIuV2ViUlRDUHJvdmlkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ3JlYXRlZCBieSBob2hvIG9uIDIwMTguIDYuIDExLi5cclxuICovXHJcbmltcG9ydCBNZWRpYU1hbmFnZXIgZnJvbSBcImFwaS9tZWRpYS9NYW5hZ2VyXCI7XHJcbmltcG9ydCBQcm92aWRlciBmcm9tIFwiYXBpL3Byb3ZpZGVyL2h0bWw1L1Byb3ZpZGVyXCI7XHJcbmltcG9ydCBXZWJSVENMb2FkZXIgZnJvbSBcImFwaS9wcm92aWRlci9odG1sNS9XZWJSVENMb2FkZXJcIjtcclxuaW1wb3J0IFByb21pc2UsIHtyZXNvbHZlZH0gZnJvbSBcImFwaS9zaGltcy9wcm9taXNlXCI7XHJcbmltcG9ydCB7aXNXZWJSVEN9IGZyb20gXCJ1dGlscy92YWxpZGF0b3JcIjtcclxuaW1wb3J0IHtFUlJPUiwgU1RBVEVfRVJST1IsIFBST1ZJREVSX1dFQlJUQ30gZnJvbSBcImFwaS9jb25zdGFudHNcIjtcclxuXHJcbi8qKlxyXG4gKiBAYnJpZWYgICB3ZWJydGMgcHJvdmlkZXIgZXh0ZW5kZWQgY29yZS5cclxuICogQHBhcmFtICAgZWxlbWVudCB2aWRlbyBlbGVtZW50LlxyXG4gKiBAcGFyYW0gICBwbGF5ZXJDb25maWcgICAgY29uZmlnLlxyXG4gKiAqL1xyXG5cclxuY29uc3QgV2ViUlRDID0gZnVuY3Rpb24oY29udGFpbmVyLCBwbGF5ZXJDb25maWcpe1xyXG5cclxuICAgIGxldCBtZWRpYU1hbmFnZXIgPSBNZWRpYU1hbmFnZXIoY29udGFpbmVyLCBQUk9WSURFUl9XRUJSVEMpO1xyXG4gICAgbGV0IGVsZW1lbnQgPSBtZWRpYU1hbmFnZXIuY3JlYXRlKCk7XHJcblxyXG4gICAgbGV0IHdlYnJ0Y0xvYWRlciA9IG51bGw7XHJcbiAgICBsZXQgdGhhdCA9IHt9LCBzdXBlcl9kZXN0cm95ICA9IFwiXCIsIGxpc3RlbmVyID0gXCJcIjtcclxuXHJcbiAgICBsZXQgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oZXJyb3Ipe1xyXG4gICAgICAgIHRoYXQuc2V0U3RhdGUoU1RBVEVfRVJST1IpO1xyXG4gICAgICAgIHRoYXQucGF1c2UoKTtcclxuICAgICAgICB0aGF0LnRyaWdnZXIoRVJST1IsIGVycm9yICk7XHJcbiAgICB9O1xyXG4gICAgY29uc3Qgb25CZWZvcmVMb2FkID0gKHNvdXJjZSkgPT4ge1xyXG4gICAgICAgIGlmKGlzV2ViUlRDKHNvdXJjZS5maWxlLCBzb3VyY2UudHlwZSkpe1xyXG4gICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coXCJXRUJSVEMgOiBvbkJlZm9yZUxvYWQgOiBcIiwgc291cmNlKTtcclxuICAgICAgICAgICAgaWYod2VicnRjTG9hZGVyKXtcclxuICAgICAgICAgICAgICAgIHdlYnJ0Y0xvYWRlci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICB3ZWJydGNMb2FkZXIgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHdlYnJ0Y0xvYWRlciA9IFdlYlJUQ0xvYWRlcih0aGF0LCBzb3VyY2UuZmlsZSwgZXJyb3JIYW5kbGVyKTtcclxuICAgICAgICAgICAgd2VicnRjTG9hZGVyLmNvbm5lY3QoKS50aGVuKGZ1bmN0aW9uKHN0cmVhbSl7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnNyY09iamVjdCA9IHN0cmVhbTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQucGxheSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRoYXQgPSBQcm92aWRlcihQUk9WSURFUl9XRUJSVEMsIGVsZW1lbnQsIHBsYXllckNvbmZpZywgb25CZWZvcmVMb2FkKTtcclxuICAgIE92ZW5QbGF5ZXJDb25zb2xlLmxvZyhcIldFQlJUQyBQUk9WSURFUiBMT0FERUQuXCIpO1xyXG4gICAgc3VwZXJfZGVzdHJveSA9IHRoYXQuc3VwZXIoJ2Rlc3Ryb3knKTtcclxuXHJcbiAgICB0aGF0LmRlc3Ryb3kgPSAoKSA9PntcclxuICAgICAgICBpZih3ZWJydGNMb2FkZXIpe1xyXG4gICAgICAgICAgICB3ZWJydGNMb2FkZXIuZGVzdHJveSgpO1xyXG4gICAgICAgICAgICB3ZWJydGNMb2FkZXIgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtZWRpYU1hbmFnZXIuZGVzdHJveSgpO1xyXG5cclxuICAgICAgICBzdXBlcl9kZXN0cm95KCk7XHJcbiAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKFwiV0VCUlRDIDogIFBST1ZJREVSIERFU1RST1lFRC5cIik7XHJcblxyXG4gICAgfTtcclxuICAgIHJldHVybiB0aGF0O1xyXG59O1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IFdlYlJUQzsiLCJpbXBvcnQgYWRhcHRlciBmcm9tICd1dGlscy9hZGFwdGVyJztcclxuaW1wb3J0IFByb21pc2UsIHtyZXNvbHZlZH0gZnJvbSBcImFwaS9zaGltcy9wcm9taXNlXCI7XHJcbmltcG9ydCBfIGZyb20gXCJ1dGlscy91bmRlcnNjb3JlXCI7XHJcbmltcG9ydCB7XHJcbiAgICBQTEFZRVJfV0VCUlRDX1dTX0VSUk9SLFxyXG4gICAgUExBWUVSX1dFQlJUQ19XU19DTE9TRUQsXHJcbiAgICBQTEFZRVJfV0VCUlRDX0FERF9JQ0VDQU5ESURBVEVfRVJST1IsXHJcbiAgICBQTEFZRVJfV0VCUlRDX1NFVF9SRU1PVEVfREVTQ19FUlJPUixcclxuICAgIFBMQVlFUl9XRUJSVENfQ1JFQVRFX0FOU1dFUl9FUlJPUixcclxuICAgIFBMQVlFUl9XRUJSVENfU0VUX0xPQ0FMX0RFU0NfRVJST1IsXHJcbiAgICBQTEFZRVJfV0VCUlRDX05FVFdPUktfU0xPVyxcclxuICAgIE5FVFdPUktfVU5TVEFCTEVEXHJcbn0gZnJvbSBcImFwaS9jb25zdGFudHNcIjtcclxuXHJcblxyXG5jb25zdCBXZWJSVENMb2FkZXIgPSBmdW5jdGlvbihwcm92aWRlciwgdXJsLCBlcnJvckNhbGxiYWNrKXtcclxuICAgIHZhciB1cmwgPSB1cmw7XHJcbiAgICBsZXQgd3MgPSBcIlwiO1xyXG4gICAgbGV0IHBlZXJDb25uZWN0aW9uID0gXCJcIjtcclxuICAgIGxldCBzdGF0aXN0aWNzVGltZXIgPSBcIlwiO1xyXG4gICAgY29uc3QgY29uZmlnID0ge1xyXG4gICAgICAgICdpY2VTZXJ2ZXJzJzogW3tcclxuICAgICAgICAgICAgJ3VybHMnOiAnc3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMidcclxuICAgICAgICB9XVxyXG4gICAgfTtcclxuICAgIGNvbnN0IHRoYXQgPSB7fTtcclxuICAgIGxldCBteVNkcCA9IFwiXCI7XHJcblxyXG5cclxuICAgIChmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgZXhpc3RpbmdIYW5kbGVyID0gd2luZG93Lm9uYmVmb3JldW5sb2FkO1xyXG4gICAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0hhbmRsZXIpe1xyXG4gICAgICAgICAgICAgICAgZXhpc3RpbmdIYW5kbGVyKGV2ZW50KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKFwiVGhpcyBjYWxscyBhdXRvIHdoZW4gYnJvd3NlciBjbG9zZWQuXCIpO1xyXG4gICAgICAgICAgICBjbG9zZVBlZXIoKTtcclxuICAgICAgICB9XHJcbiAgICB9KSgpO1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIE92ZW5QbGF5ZXJDb25zb2xlLmxvZyhcIldlYlJUQ0xvYWRlciBjb25uZWN0aW5nLi4uXCIpO1xyXG5cclxuICAgICAgICBjb25zdCBvbkxvY2FsRGVzY3JpcHRpb24gPSBmdW5jdGlvbihpZCwgY29ubmVjdGlvbiwgZGVzYykge1xyXG4gICAgICAgICAgICBjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oZGVzYykudGhlbihmdW5jdGlvbiAoKXtcclxuICAgICAgICAgICAgICAgIC8vIG15IFNEUCBjcmVhdGVkLlxyXG4gICAgICAgICAgICAgICAgdmFyIGxvY2FsU0RQID0gY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKCdMb2NhbCBTRFAnLCBsb2NhbFNEUCk7XHJcbiAgICAgICAgICAgICAgICBteVNkcCA9IGxvY2FsU0RQOyAgIC8vdGVzdCBjb2RlXHJcbiAgICAgICAgICAgICAgICAvLyBteSBzZHAgc2VuZCB0byBzZXJ2ZXIuXHJcbiAgICAgICAgICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZCA6IFwiYW5zd2VyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc2RwOiBsb2NhbFNEUFxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnJvcil7XHJcbiAgICAgICAgICAgICAgICBjbG9zZVBlZXIoe2NvZGUgOiBQTEFZRVJfV0VCUlRDX1NFVF9MT0NBTF9ERVNDX0VSUk9SLCByZWFzb24gOiBcInNldExvY2FsRGVzY3JpcHRpb24gZXJyb3Igb2NjdXJyZWRcIiwgbWVzc2FnZSA6IFwic2V0TG9jYWxEZXNjcmlwdGlvbiBlcnJvciBvY2N1cnJlZFwiLCBlcnJvciA6IGVycm9yfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coXCJXZWJSVENMb2FkZXIgdXJsIDogXCIgKyB1cmwpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgd3MgPSBuZXcgV2ViU29ja2V0KHVybCk7XHJcbiAgICAgICAgICAgICAgICB3cy5vbm9wZW4gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHtjb21tYW5kIDogXCJyZXF1ZXN0X29mZmVyXCJ9KSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgd3Mub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobWVzc2FnZS5lcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE92ZW5QbGF5ZXJDb25zb2xlLmxvZyhtZXNzYWdlLmVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VQZWVyKHtjb2RlIDogUExBWUVSX1dFQlJUQ19XU19FUlJPUiwgcmVhc29uIDogXCJ3ZWJzb2NrZXQgZXJyb3Igb2NjdXJlZFwiLCBtZXNzYWdlIDogXCJ3ZWJzb2NrZXQgZXJyb3Igb2NjdXJyZWRcIiwgZXJyb3IgOiBtZXNzYWdlfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKG1lc3NhZ2UubGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coJ0xpc3QgcmVjZWl2ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIW1lc3NhZ2UuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKCdJRCBtdXN0IGJlIG5vdCBudWxsJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKCFwZWVyQ29ubmVjdGlvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZXJDb25uZWN0aW9uID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGNvbmZpZyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwZWVyQ29ubmVjdGlvbi5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGUuY2FuZGlkYXRlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coXCJXZWJSVENMb2FkZXIgc2VuZCBjYW5kaWRhdGUgdG8gc2VydmVyIDogXCIgKyBlLmNhbmRpZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kIDogXCJjYW5kaWRhdGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlczogW2UuY2FuZGlkYXRlXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZXJDb25uZWN0aW9uLm9ubmVnb3RpYXRpb25uZWVkZWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZXJDb25uZWN0aW9uLmNyZWF0ZU9mZmVyKCkudGhlbihmdW5jdGlvbihkZXNjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKFwiY3JlYXRlT2ZmZXIgOiBzdWNjZXNzXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Mb2NhbERlc2NyaXB0aW9uKG1lc3NhZ2UuaWQsIHBlZXJDb25uZWN0aW9uLCBkZXNjKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VQZWVyKHtjb2RlIDogUExBWUVSX1dFQlJUQ19DUkVBVEVfQU5TV0VSX0VSUk9SLCByZWFzb24gOiBcImNyZWF0ZU9mZmVyIGVycm9yIG9jY3VycmVkXCIsIG1lc3NhZ2UgOiBcImNyZWF0ZU9mZmVyIGVycm9yIG9jY3VycmVkXCIsIGVycm9yIDogZXJyb3J9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcGVlckNvbm5lY3Rpb24ub25hZGRzdHJlYW0gPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coXCJzdHJlYW0gcmVjZWl2ZWQuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RyZWFtIHJlY2VpdmVkLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxvc3RQYWNrZXRzQXJyID0gW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2xvdExlbmd0aCA9IDgsIC8vOCBzdGF0aXN0aWNzLiBldmVyeSAyIHNlY29uZHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2UGFja2V0c0xvc3QgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2ZzhMb3NzZXMgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2Z01vcmVUaGFuVGhyZXNob2xkQ291bnQgPSAwLCAgLy9JZiBhdmc4TG9zcyBtb3JlIHRoYW4gdGhyZXNob2xkLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocmVzaG9sZCA9IDIwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0cmFjdExvc3NQYWNrZXRzT25OZXR3b3JrU3RhdHVzID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0aXN0aWNzVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFwZWVyQ29ubmVjdGlvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVlckNvbm5lY3Rpb24uZ2V0U3RhdHMoKS50aGVuKGZ1bmN0aW9uKHN0YXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHN0YXRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRzLmZvckVhY2goZnVuY3Rpb24oc3RhdGUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXRlLnR5cGUgPT09IFwiaW5ib3VuZC1ydHBcIiAmJiAhc3RhdGUuaXNSZW1vdGUgKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKHN0YXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vKHN0YXRlLnBhY2tldHNMb3N0IC0gcHJldlBhY2tldHNMb3N0KSBpcyByZWFsIGN1cnJlbnQgbG9zdC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9zdFBhY2tldHNBcnIucHVzaChwYXJzZUludChzdGF0ZS5wYWNrZXRzTG9zdCktcGFyc2VJbnQocHJldlBhY2tldHNMb3N0KSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsb3N0UGFja2V0c0Fyci5sZW5ndGggPiBzbG90TGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvc3RQYWNrZXRzQXJyID0gbG9zdFBhY2tldHNBcnIuc2xpY2UobG9zdFBhY2tldHNBcnIubGVuZ3RoIC0gc2xvdExlbmd0aCwgbG9zdFBhY2tldHNBcnIubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2ZzhMb3NzZXMgPSBfLnJlZHVjZShsb3N0UGFja2V0c0FyciwgZnVuY3Rpb24obWVtbywgbnVtKXsgcmV0dXJuIG1lbW8gKyBudW07IH0sIDApIC8gc2xvdExlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE92ZW5QbGF5ZXJDb25zb2xlLmxvZyhcIkxhc3Q4IExPU1QgUEFDS0VUIEFWRyAgOiBcIisgKGF2ZzhMb3NzZXMpLCBzdGF0ZS5wYWNrZXRzTG9zdCAsIGxvc3RQYWNrZXRzQXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGF2ZzhMb3NzZXMgPiB0aHJlc2hvbGQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2Z01vcmVUaGFuVGhyZXNob2xkQ291bnQgKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXZnTW9yZVRoYW5UaHJlc2hvbGRDb3VudCA9PT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE92ZW5QbGF5ZXJDb25zb2xlLmxvZyhcIk5FVFdPUksgVU5TVEFCTEVEISEhIFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHN0YXRpc3RpY3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyLnRyaWdnZXIoTkVUV09SS19VTlNUQUJMRUQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2Z01vcmVUaGFuVGhyZXNob2xkQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldlBhY2tldHNMb3N0ID0gc3RhdGUucGFja2V0c0xvc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0TG9zc1BhY2tldHNPbk5ldHdvcmtTdGF0dXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RMb3NzUGFja2V0c09uTmV0d29ya1N0YXR1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShlLnN0cmVhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZihtZXNzYWdlLnNkcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NldCByZW1vdGUgZGVzY3JpcHRpb24gd2hlbiBJIHJlY2VpdmVkIHNkcCBmcm9tIHNlcnZlci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcGVlckNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihtZXNzYWdlLnNkcCkpLnRoZW4oZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHBlZXJDb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgYW5zd2VyIHdoZW4gSSByZWNlaXZlZCBvZmZlciBmcm9tIHB1Ymxpc2hlci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWVyQ29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoKS50aGVuKGZ1bmN0aW9uKGRlc2Mpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coXCJjcmVhdGVBbnN3ZXIgOiBzdWNjZXNzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkxvY2FsRGVzY3JpcHRpb24obWVzc2FnZS5pZCwgcGVlckNvbm5lY3Rpb24sIGRlc2MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VQZWVyKHtjb2RlIDogUExBWUVSX1dFQlJUQ19DUkVBVEVfQU5TV0VSX0VSUk9SLCByZWFzb24gOiBcImNyZWF0ZUFuc3dlciBlcnJvciBvY2N1cnJlZFwiLCBtZXNzYWdlIDogXCJjcmVhdGVBbnN3ZXIgZXJyb3Igb2NjdXJyZWRcIiwgZXJyb3IgOiBlcnJvcn0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zZVBlZXIoe2NvZGUgOiBQTEFZRVJfV0VCUlRDX1NFVF9SRU1PVEVfREVTQ19FUlJPUiwgcmVhc29uIDogXCJzZXRSZW1vdGVEZXNjcmlwdGlvbiBlcnJvciBvY2N1cnJlZFwiLCBtZXNzYWdlIDogXCJzZXRSZW1vdGVEZXNjcmlwdGlvbiBlcnJvciBvY2N1cnJlZFwiLCBlcnJvciA6IGVycm9yfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYobWVzc2FnZS5jYW5kaWRhdGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgcmVjZWl2ZXMgSUNFIENhbmRpZGF0ZSBmcm9tIHNlcnZlci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IG1lc3NhZ2UuY2FuZGlkYXRlcy5sZW5ndGg7IGkgKysgKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG1lc3NhZ2UuY2FuZGlkYXRlc1tpXSAmJiBtZXNzYWdlLmNhbmRpZGF0ZXNbaV0uY2FuZGlkYXRlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZXJDb25uZWN0aW9uLmFkZEljZUNhbmRpZGF0ZShuZXcgUlRDSWNlQ2FuZGlkYXRlKG1lc3NhZ2UuY2FuZGlkYXRlc1tpXSkpLnRoZW4oZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKFwiYWRkSWNlQ2FuZGlkYXRlIDogc3VjY2Vzc1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NlUGVlcih7Y29kZSA6IFBMQVlFUl9XRUJSVENfQUREX0lDRUNBTkRJREFURV9FUlJPUiwgcmVhc29uIDogXCJhZGRJY2VDYW5kaWRhdGUgZXJyb3Igb2NjdXJyZWRcIiwgbWVzc2FnZSA6IFwiYWRkSWNlQ2FuZGlkYXRlIGVycm9yIG9jY3VycmVkXCIsIGVycm9yIDogZXJyb3J9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgd3Mub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjbG9zZVBlZXIoe2NvZGUgOiBQTEFZRVJfV0VCUlRDX1dTX0VSUk9SLCByZWFzb24gOiBcIndlYnNvY2tldCBlcnJvciBvY2N1cmVkXCIsIG1lc3NhZ2UgOiBcIndlYnNvY2tldCBlcnJvciBvY2N1cnJlZFwiLCBlcnJvciA6IGV9KTtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9Y2F0Y2goZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgY2xvc2VQZWVyKHtjb2RlIDogUExBWUVSX1dFQlJUQ19XU19FUlJPUiwgcmVhc29uIDogXCJ3ZWJzb2NrZXQgZXJyb3Igb2NjdXJlZFwiLCBtZXNzYWdlIDogXCJ3ZWJzb2NrZXQgZXJyb3Igb2NjdXJyZWRcIiwgZXJyb3IgOiBlcnJvcn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xvc2VQZWVyKGVycm9yKSB7XHJcbiAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKCdXZWJSVEMgTG9hZGVyIGNsb3NlUGVlYXIoKScpO1xyXG4gICAgICAgIGlmKCEhd3MpIHtcclxuICAgICAgICAgICAgT3ZlblBsYXllckNvbnNvbGUubG9nKCdDbG9zaW5nIHdlYnNvY2tldCBjb25uZWN0aW9uLi4uJyk7XHJcbiAgICAgICAgICAgIE92ZW5QbGF5ZXJDb25zb2xlLmxvZyhcIlNlbmQgU2lnbmFsaW5nIDogU3RvcC5cIik7XHJcbiAgICAgICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoe2NvbW1hbmQgOiBcInN0b3BcIn0pKTtcclxuICAgICAgICAgICAgd3MuY2xvc2UoKTtcclxuICAgICAgICAgICAgd3MgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihwZWVyQ29ubmVjdGlvbikge1xyXG4gICAgICAgICAgICBPdmVuUGxheWVyQ29uc29sZS5sb2coJ0Nsb3NpbmcgcGVlciBjb25uZWN0aW9uLi4uJyk7XHJcbiAgICAgICAgICAgIGlmKHN0YXRpc3RpY3NUaW1lcil7Y2xlYXJUaW1lb3V0KHN0YXRpc3RpY3NUaW1lcik7fVxyXG4gICAgICAgICAgICBwZWVyQ29ubmVjdGlvbi5jbG9zZSgpO1xyXG4gICAgICAgICAgICBwZWVyQ29ubmVjdGlvbiA9IG51bGw7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZihlcnJvcil7XHJcbiAgICAgICAgICAgIGVycm9yQ2FsbGJhY2soZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgdGhhdC5jb25uZWN0ID0gKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBpbml0aWFsaXplKCk7XHJcbiAgICB9O1xyXG4gICAgdGhhdC5kZXN0cm95ID0gKCkgPT4ge1xyXG4gICAgICAgIGNsb3NlUGVlcigpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiB0aGF0O1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgV2ViUlRDTG9hZGVyOyIsIihmdW5jdGlvbihmKXtpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCImJnR5cGVvZiBtb2R1bGUhPT1cInVuZGVmaW5lZFwiKXttb2R1bGUuZXhwb3J0cz1mKCl9ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kKXtkZWZpbmUoW10sZil9ZWxzZXt2YXIgZztpZih0eXBlb2Ygd2luZG93IT09XCJ1bmRlZmluZWRcIil7Zz13aW5kb3d9ZWxzZSBpZih0eXBlb2YgZ2xvYmFsIT09XCJ1bmRlZmluZWRcIil7Zz1nbG9iYWx9ZWxzZSBpZih0eXBlb2Ygc2VsZiE9PVwidW5kZWZpbmVkXCIpe2c9c2VsZn1lbHNle2c9dGhpc31nLmFkYXB0ZXIgPSBmKCl9fSkoZnVuY3Rpb24oKXt2YXIgZGVmaW5lLG1vZHVsZSxleHBvcnRzO3JldHVybiAoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKlxuICogIENvcHlyaWdodCAoYykgMjAxNyBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbiAvKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFNEUFV0aWxzID0gcmVxdWlyZSgnc2RwJyk7XG5cbmZ1bmN0aW9uIHdyaXRlTWVkaWFTZWN0aW9uKHRyYW5zY2VpdmVyLCBjYXBzLCB0eXBlLCBzdHJlYW0sIGR0bHNSb2xlKSB7XG4gIHZhciBzZHAgPSBTRFBVdGlscy53cml0ZVJ0cERlc2NyaXB0aW9uKHRyYW5zY2VpdmVyLmtpbmQsIGNhcHMpO1xuXG4gIC8vIE1hcCBJQ0UgcGFyYW1ldGVycyAodWZyYWcsIHB3ZCkgdG8gU0RQLlxuICBzZHAgKz0gU0RQVXRpbHMud3JpdGVJY2VQYXJhbWV0ZXJzKFxuICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIuZ2V0TG9jYWxQYXJhbWV0ZXJzKCkpO1xuXG4gIC8vIE1hcCBEVExTIHBhcmFtZXRlcnMgdG8gU0RQLlxuICBzZHAgKz0gU0RQVXRpbHMud3JpdGVEdGxzUGFyYW1ldGVycyhcbiAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQuZ2V0TG9jYWxQYXJhbWV0ZXJzKCksXG4gICAgICB0eXBlID09PSAnb2ZmZXInID8gJ2FjdHBhc3MnIDogZHRsc1JvbGUgfHwgJ2FjdGl2ZScpO1xuXG4gIHNkcCArPSAnYT1taWQ6JyArIHRyYW5zY2VpdmVyLm1pZCArICdcXHJcXG4nO1xuXG4gIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIgJiYgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICBzZHAgKz0gJ2E9c2VuZHJlY3ZcXHJcXG4nO1xuICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlcikge1xuICAgIHNkcCArPSAnYT1zZW5kb25seVxcclxcbic7XG4gIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICBzZHAgKz0gJ2E9cmVjdm9ubHlcXHJcXG4nO1xuICB9IGVsc2Uge1xuICAgIHNkcCArPSAnYT1pbmFjdGl2ZVxcclxcbic7XG4gIH1cblxuICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyKSB7XG4gICAgdmFyIHRyYWNrSWQgPSB0cmFuc2NlaXZlci5ydHBTZW5kZXIuX2luaXRpYWxUcmFja0lkIHx8XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci50cmFjay5pZDtcbiAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIuX2luaXRpYWxUcmFja0lkID0gdHJhY2tJZDtcbiAgICAvLyBzcGVjLlxuICAgIHZhciBtc2lkID0gJ21zaWQ6JyArIChzdHJlYW0gPyBzdHJlYW0uaWQgOiAnLScpICsgJyAnICtcbiAgICAgICAgdHJhY2tJZCArICdcXHJcXG4nO1xuICAgIHNkcCArPSAnYT0nICsgbXNpZDtcbiAgICAvLyBmb3IgQ2hyb21lLiBMZWdhY3kgc2hvdWxkIG5vIGxvbmdlciBiZSByZXF1aXJlZC5cbiAgICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICtcbiAgICAgICAgJyAnICsgbXNpZDtcblxuICAgIC8vIFJUWFxuICAgIGlmICh0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgICAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4LnNzcmMgK1xuICAgICAgICAgICcgJyArIG1zaWQ7XG4gICAgICBzZHAgKz0gJ2E9c3NyYy1ncm91cDpGSUQgJyArXG4gICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICsgJyAnICtcbiAgICAgICAgICB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eC5zc3JjICtcbiAgICAgICAgICAnXFxyXFxuJztcbiAgICB9XG4gIH1cbiAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGJlIHdyaXR0ZW4gYnkgd3JpdGVSdHBEZXNjcmlwdGlvbi5cbiAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArXG4gICAgICAnIGNuYW1lOicgKyBTRFBVdGlscy5sb2NhbENOYW1lICsgJ1xcclxcbic7XG4gIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIgJiYgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHguc3NyYyArXG4gICAgICAgICcgY25hbWU6JyArIFNEUFV0aWxzLmxvY2FsQ05hbWUgKyAnXFxyXFxuJztcbiAgfVxuICByZXR1cm4gc2RwO1xufVxuXG4vLyBFZGdlIGRvZXMgbm90IGxpa2Vcbi8vIDEpIHN0dW46IGZpbHRlcmVkIGFmdGVyIDE0MzkzIHVubGVzcyA/dHJhbnNwb3J0PXVkcCBpcyBwcmVzZW50XG4vLyAyKSB0dXJuOiB0aGF0IGRvZXMgbm90IGhhdmUgYWxsIG9mIHR1cm46aG9zdDpwb3J0P3RyYW5zcG9ydD11ZHBcbi8vIDMpIHR1cm46IHdpdGggaXB2NiBhZGRyZXNzZXNcbi8vIDQpIHR1cm46IG9jY3VycmluZyBtdWxpcGxlIHRpbWVzXG5mdW5jdGlvbiBmaWx0ZXJJY2VTZXJ2ZXJzKGljZVNlcnZlcnMsIGVkZ2VWZXJzaW9uKSB7XG4gIHZhciBoYXNUdXJuID0gZmFsc2U7XG4gIGljZVNlcnZlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGljZVNlcnZlcnMpKTtcbiAgcmV0dXJuIGljZVNlcnZlcnMuZmlsdGVyKGZ1bmN0aW9uKHNlcnZlcikge1xuICAgIGlmIChzZXJ2ZXIgJiYgKHNlcnZlci51cmxzIHx8IHNlcnZlci51cmwpKSB7XG4gICAgICB2YXIgdXJscyA9IHNlcnZlci51cmxzIHx8IHNlcnZlci51cmw7XG4gICAgICBpZiAoc2VydmVyLnVybCAmJiAhc2VydmVyLnVybHMpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdSVENJY2VTZXJ2ZXIudXJsIGlzIGRlcHJlY2F0ZWQhIFVzZSB1cmxzIGluc3RlYWQuJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXNTdHJpbmcgPSB0eXBlb2YgdXJscyA9PT0gJ3N0cmluZyc7XG4gICAgICBpZiAoaXNTdHJpbmcpIHtcbiAgICAgICAgdXJscyA9IFt1cmxzXTtcbiAgICAgIH1cbiAgICAgIHVybHMgPSB1cmxzLmZpbHRlcihmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdmFyIHZhbGlkVHVybiA9IHVybC5pbmRleE9mKCd0dXJuOicpID09PSAwICYmXG4gICAgICAgICAgICB1cmwuaW5kZXhPZigndHJhbnNwb3J0PXVkcCcpICE9PSAtMSAmJlxuICAgICAgICAgICAgdXJsLmluZGV4T2YoJ3R1cm46WycpID09PSAtMSAmJlxuICAgICAgICAgICAgIWhhc1R1cm47XG5cbiAgICAgICAgaWYgKHZhbGlkVHVybikge1xuICAgICAgICAgIGhhc1R1cm4gPSB0cnVlO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmwuaW5kZXhPZignc3R1bjonKSA9PT0gMCAmJiBlZGdlVmVyc2lvbiA+PSAxNDM5MyAmJlxuICAgICAgICAgICAgdXJsLmluZGV4T2YoJz90cmFuc3BvcnQ9dWRwJykgPT09IC0xO1xuICAgICAgfSk7XG5cbiAgICAgIGRlbGV0ZSBzZXJ2ZXIudXJsO1xuICAgICAgc2VydmVyLnVybHMgPSBpc1N0cmluZyA/IHVybHNbMF0gOiB1cmxzO1xuICAgICAgcmV0dXJuICEhdXJscy5sZW5ndGg7XG4gICAgfVxuICB9KTtcbn1cblxuLy8gRGV0ZXJtaW5lcyB0aGUgaW50ZXJzZWN0aW9uIG9mIGxvY2FsIGFuZCByZW1vdGUgY2FwYWJpbGl0aWVzLlxuZnVuY3Rpb24gZ2V0Q29tbW9uQ2FwYWJpbGl0aWVzKGxvY2FsQ2FwYWJpbGl0aWVzLCByZW1vdGVDYXBhYmlsaXRpZXMpIHtcbiAgdmFyIGNvbW1vbkNhcGFiaWxpdGllcyA9IHtcbiAgICBjb2RlY3M6IFtdLFxuICAgIGhlYWRlckV4dGVuc2lvbnM6IFtdLFxuICAgIGZlY01lY2hhbmlzbXM6IFtdXG4gIH07XG5cbiAgdmFyIGZpbmRDb2RlY0J5UGF5bG9hZFR5cGUgPSBmdW5jdGlvbihwdCwgY29kZWNzKSB7XG4gICAgcHQgPSBwYXJzZUludChwdCwgMTApO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29kZWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY29kZWNzW2ldLnBheWxvYWRUeXBlID09PSBwdCB8fFxuICAgICAgICAgIGNvZGVjc1tpXS5wcmVmZXJyZWRQYXlsb2FkVHlwZSA9PT0gcHQpIHtcbiAgICAgICAgcmV0dXJuIGNvZGVjc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgdmFyIHJ0eENhcGFiaWxpdHlNYXRjaGVzID0gZnVuY3Rpb24obFJ0eCwgclJ0eCwgbENvZGVjcywgckNvZGVjcykge1xuICAgIHZhciBsQ29kZWMgPSBmaW5kQ29kZWNCeVBheWxvYWRUeXBlKGxSdHgucGFyYW1ldGVycy5hcHQsIGxDb2RlY3MpO1xuICAgIHZhciByQ29kZWMgPSBmaW5kQ29kZWNCeVBheWxvYWRUeXBlKHJSdHgucGFyYW1ldGVycy5hcHQsIHJDb2RlY3MpO1xuICAgIHJldHVybiBsQ29kZWMgJiYgckNvZGVjICYmXG4gICAgICAgIGxDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IHJDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCk7XG4gIH07XG5cbiAgbG9jYWxDYXBhYmlsaXRpZXMuY29kZWNzLmZvckVhY2goZnVuY3Rpb24obENvZGVjKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZW1vdGVDYXBhYmlsaXRpZXMuY29kZWNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgckNvZGVjID0gcmVtb3RlQ2FwYWJpbGl0aWVzLmNvZGVjc1tpXTtcbiAgICAgIGlmIChsQ29kZWMubmFtZS50b0xvd2VyQ2FzZSgpID09PSByQ29kZWMubmFtZS50b0xvd2VyQ2FzZSgpICYmXG4gICAgICAgICAgbENvZGVjLmNsb2NrUmF0ZSA9PT0gckNvZGVjLmNsb2NrUmF0ZSkge1xuICAgICAgICBpZiAobENvZGVjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3J0eCcgJiZcbiAgICAgICAgICAgIGxDb2RlYy5wYXJhbWV0ZXJzICYmIHJDb2RlYy5wYXJhbWV0ZXJzLmFwdCkge1xuICAgICAgICAgIC8vIGZvciBSVFggd2UgbmVlZCB0byBmaW5kIHRoZSBsb2NhbCBydHggdGhhdCBoYXMgYSBhcHRcbiAgICAgICAgICAvLyB3aGljaCBwb2ludHMgdG8gdGhlIHNhbWUgbG9jYWwgY29kZWMgYXMgdGhlIHJlbW90ZSBvbmUuXG4gICAgICAgICAgaWYgKCFydHhDYXBhYmlsaXR5TWF0Y2hlcyhsQ29kZWMsIHJDb2RlYyxcbiAgICAgICAgICAgICAgbG9jYWxDYXBhYmlsaXRpZXMuY29kZWNzLCByZW1vdGVDYXBhYmlsaXRpZXMuY29kZWNzKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJDb2RlYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkockNvZGVjKSk7IC8vIGRlZXBjb3B5XG4gICAgICAgIC8vIG51bWJlciBvZiBjaGFubmVscyBpcyB0aGUgaGlnaGVzdCBjb21tb24gbnVtYmVyIG9mIGNoYW5uZWxzXG4gICAgICAgIHJDb2RlYy5udW1DaGFubmVscyA9IE1hdGgubWluKGxDb2RlYy5udW1DaGFubmVscyxcbiAgICAgICAgICAgIHJDb2RlYy5udW1DaGFubmVscyk7XG4gICAgICAgIC8vIHB1c2ggckNvZGVjIHNvIHdlIHJlcGx5IHdpdGggb2ZmZXJlciBwYXlsb2FkIHR5cGVcbiAgICAgICAgY29tbW9uQ2FwYWJpbGl0aWVzLmNvZGVjcy5wdXNoKHJDb2RlYyk7XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIGNvbW1vbiBmZWVkYmFjayBtZWNoYW5pc21zXG4gICAgICAgIHJDb2RlYy5ydGNwRmVlZGJhY2sgPSByQ29kZWMucnRjcEZlZWRiYWNrLmZpbHRlcihmdW5jdGlvbihmYikge1xuICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbENvZGVjLnJ0Y3BGZWVkYmFjay5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKGxDb2RlYy5ydGNwRmVlZGJhY2tbal0udHlwZSA9PT0gZmIudHlwZSAmJlxuICAgICAgICAgICAgICAgIGxDb2RlYy5ydGNwRmVlZGJhY2tbal0ucGFyYW1ldGVyID09PSBmYi5wYXJhbWV0ZXIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZJWE1FOiBhbHNvIG5lZWQgdG8gZGV0ZXJtaW5lIC5wYXJhbWV0ZXJzXG4gICAgICAgIC8vICBzZWUgaHR0cHM6Ly9naXRodWIuY29tL29wZW5wZWVyL29ydGMvaXNzdWVzLzU2OVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGxvY2FsQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMuZm9yRWFjaChmdW5jdGlvbihsSGVhZGVyRXh0ZW5zaW9uKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZW1vdGVDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucy5sZW5ndGg7XG4gICAgICAgICBpKyspIHtcbiAgICAgIHZhciBySGVhZGVyRXh0ZW5zaW9uID0gcmVtb3RlQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNbaV07XG4gICAgICBpZiAobEhlYWRlckV4dGVuc2lvbi51cmkgPT09IHJIZWFkZXJFeHRlbnNpb24udXJpKSB7XG4gICAgICAgIGNvbW1vbkNhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zLnB1c2gockhlYWRlckV4dGVuc2lvbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gRklYTUU6IGZlY01lY2hhbmlzbXNcbiAgcmV0dXJuIGNvbW1vbkNhcGFiaWxpdGllcztcbn1cblxuLy8gaXMgYWN0aW9uPXNldExvY2FsRGVzY3JpcHRpb24gd2l0aCB0eXBlIGFsbG93ZWQgaW4gc2lnbmFsaW5nU3RhdGVcbmZ1bmN0aW9uIGlzQWN0aW9uQWxsb3dlZEluU2lnbmFsaW5nU3RhdGUoYWN0aW9uLCB0eXBlLCBzaWduYWxpbmdTdGF0ZSkge1xuICByZXR1cm4ge1xuICAgIG9mZmVyOiB7XG4gICAgICBzZXRMb2NhbERlc2NyaXB0aW9uOiBbJ3N0YWJsZScsICdoYXZlLWxvY2FsLW9mZmVyJ10sXG4gICAgICBzZXRSZW1vdGVEZXNjcmlwdGlvbjogWydzdGFibGUnLCAnaGF2ZS1yZW1vdGUtb2ZmZXInXVxuICAgIH0sXG4gICAgYW5zd2VyOiB7XG4gICAgICBzZXRMb2NhbERlc2NyaXB0aW9uOiBbJ2hhdmUtcmVtb3RlLW9mZmVyJywgJ2hhdmUtbG9jYWwtcHJhbnN3ZXInXSxcbiAgICAgIHNldFJlbW90ZURlc2NyaXB0aW9uOiBbJ2hhdmUtbG9jYWwtb2ZmZXInLCAnaGF2ZS1yZW1vdGUtcHJhbnN3ZXInXVxuICAgIH1cbiAgfVt0eXBlXVthY3Rpb25dLmluZGV4T2Yoc2lnbmFsaW5nU3RhdGUpICE9PSAtMTtcbn1cblxuZnVuY3Rpb24gbWF5YmVBZGRDYW5kaWRhdGUoaWNlVHJhbnNwb3J0LCBjYW5kaWRhdGUpIHtcbiAgLy8gRWRnZSdzIGludGVybmFsIHJlcHJlc2VudGF0aW9uIGFkZHMgc29tZSBmaWVsZHMgdGhlcmVmb3JlXG4gIC8vIG5vdCBhbGwgZmllbGTRlSBhcmUgdGFrZW4gaW50byBhY2NvdW50LlxuICB2YXIgYWxyZWFkeUFkZGVkID0gaWNlVHJhbnNwb3J0LmdldFJlbW90ZUNhbmRpZGF0ZXMoKVxuICAgICAgLmZpbmQoZnVuY3Rpb24ocmVtb3RlQ2FuZGlkYXRlKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGUuZm91bmRhdGlvbiA9PT0gcmVtb3RlQ2FuZGlkYXRlLmZvdW5kYXRpb24gJiZcbiAgICAgICAgICAgIGNhbmRpZGF0ZS5pcCA9PT0gcmVtb3RlQ2FuZGlkYXRlLmlwICYmXG4gICAgICAgICAgICBjYW5kaWRhdGUucG9ydCA9PT0gcmVtb3RlQ2FuZGlkYXRlLnBvcnQgJiZcbiAgICAgICAgICAgIGNhbmRpZGF0ZS5wcmlvcml0eSA9PT0gcmVtb3RlQ2FuZGlkYXRlLnByaW9yaXR5ICYmXG4gICAgICAgICAgICBjYW5kaWRhdGUucHJvdG9jb2wgPT09IHJlbW90ZUNhbmRpZGF0ZS5wcm90b2NvbCAmJlxuICAgICAgICAgICAgY2FuZGlkYXRlLnR5cGUgPT09IHJlbW90ZUNhbmRpZGF0ZS50eXBlO1xuICAgICAgfSk7XG4gIGlmICghYWxyZWFkeUFkZGVkKSB7XG4gICAgaWNlVHJhbnNwb3J0LmFkZFJlbW90ZUNhbmRpZGF0ZShjYW5kaWRhdGUpO1xuICB9XG4gIHJldHVybiAhYWxyZWFkeUFkZGVkO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VFcnJvcihuYW1lLCBkZXNjcmlwdGlvbikge1xuICB2YXIgZSA9IG5ldyBFcnJvcihkZXNjcmlwdGlvbik7XG4gIGUubmFtZSA9IG5hbWU7XG4gIC8vIGxlZ2FjeSBlcnJvciBjb2RlcyBmcm9tIGh0dHBzOi8vaGV5Y2FtLmdpdGh1Yi5pby93ZWJpZGwvI2lkbC1ET01FeGNlcHRpb24tZXJyb3ItbmFtZXNcbiAgZS5jb2RlID0ge1xuICAgIE5vdFN1cHBvcnRlZEVycm9yOiA5LFxuICAgIEludmFsaWRTdGF0ZUVycm9yOiAxMSxcbiAgICBJbnZhbGlkQWNjZXNzRXJyb3I6IDE1LFxuICAgIFR5cGVFcnJvcjogdW5kZWZpbmVkLFxuICAgIE9wZXJhdGlvbkVycm9yOiB1bmRlZmluZWRcbiAgfVtuYW1lXTtcbiAgcmV0dXJuIGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24od2luZG93LCBlZGdlVmVyc2lvbikge1xuICAvLyBodHRwczovL3czYy5naXRodWIuaW8vbWVkaWFjYXB0dXJlLW1haW4vI21lZGlhc3RyZWFtXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBhZGQgdGhlIHRyYWNrIHRvIHRoZSBzdHJlYW0gYW5kXG4gIC8vIGRpc3BhdGNoIHRoZSBldmVudCBvdXJzZWx2ZXMuXG4gIGZ1bmN0aW9uIGFkZFRyYWNrVG9TdHJlYW1BbmRGaXJlRXZlbnQodHJhY2ssIHN0cmVhbSkge1xuICAgIHN0cmVhbS5hZGRUcmFjayh0cmFjayk7XG4gICAgc3RyZWFtLmRpc3BhdGNoRXZlbnQobmV3IHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrRXZlbnQoJ2FkZHRyYWNrJyxcbiAgICAgICAge3RyYWNrOiB0cmFja30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVRyYWNrRnJvbVN0cmVhbUFuZEZpcmVFdmVudCh0cmFjaywgc3RyZWFtKSB7XG4gICAgc3RyZWFtLnJlbW92ZVRyYWNrKHRyYWNrKTtcbiAgICBzdHJlYW0uZGlzcGF0Y2hFdmVudChuZXcgd2luZG93Lk1lZGlhU3RyZWFtVHJhY2tFdmVudCgncmVtb3ZldHJhY2snLFxuICAgICAgICB7dHJhY2s6IHRyYWNrfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlyZUFkZFRyYWNrKHBjLCB0cmFjaywgcmVjZWl2ZXIsIHN0cmVhbXMpIHtcbiAgICB2YXIgdHJhY2tFdmVudCA9IG5ldyBFdmVudCgndHJhY2snKTtcbiAgICB0cmFja0V2ZW50LnRyYWNrID0gdHJhY2s7XG4gICAgdHJhY2tFdmVudC5yZWNlaXZlciA9IHJlY2VpdmVyO1xuICAgIHRyYWNrRXZlbnQudHJhbnNjZWl2ZXIgPSB7cmVjZWl2ZXI6IHJlY2VpdmVyfTtcbiAgICB0cmFja0V2ZW50LnN0cmVhbXMgPSBzdHJlYW1zO1xuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgcGMuX2Rpc3BhdGNoRXZlbnQoJ3RyYWNrJywgdHJhY2tFdmVudCk7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgUlRDUGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuXG4gICAgdmFyIF9ldmVudFRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbJ2FkZEV2ZW50TGlzdGVuZXInLCAncmVtb3ZlRXZlbnRMaXN0ZW5lcicsICdkaXNwYXRjaEV2ZW50J11cbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgICAgICAgcGNbbWV0aG9kXSA9IF9ldmVudFRhcmdldFttZXRob2RdLmJpbmQoX2V2ZW50VGFyZ2V0KTtcbiAgICAgICAgfSk7XG5cbiAgICB0aGlzLmNhblRyaWNrbGVJY2VDYW5kaWRhdGVzID0gbnVsbDtcblxuICAgIHRoaXMubmVlZE5lZ290aWF0aW9uID0gZmFsc2U7XG5cbiAgICB0aGlzLmxvY2FsU3RyZWFtcyA9IFtdO1xuICAgIHRoaXMucmVtb3RlU3RyZWFtcyA9IFtdO1xuXG4gICAgdGhpcy5sb2NhbERlc2NyaXB0aW9uID0gbnVsbDtcbiAgICB0aGlzLnJlbW90ZURlc2NyaXB0aW9uID0gbnVsbDtcblxuICAgIHRoaXMuc2lnbmFsaW5nU3RhdGUgPSAnc3RhYmxlJztcbiAgICB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSA9ICduZXcnO1xuICAgIHRoaXMuY29ubmVjdGlvblN0YXRlID0gJ25ldyc7XG4gICAgdGhpcy5pY2VHYXRoZXJpbmdTdGF0ZSA9ICduZXcnO1xuXG4gICAgY29uZmlnID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWcgfHwge30pKTtcblxuICAgIHRoaXMudXNpbmdCdW5kbGUgPSBjb25maWcuYnVuZGxlUG9saWN5ID09PSAnbWF4LWJ1bmRsZSc7XG4gICAgaWYgKGNvbmZpZy5ydGNwTXV4UG9saWN5ID09PSAnbmVnb3RpYXRlJykge1xuICAgICAgdGhyb3cobWFrZUVycm9yKCdOb3RTdXBwb3J0ZWRFcnJvcicsXG4gICAgICAgICAgJ3J0Y3BNdXhQb2xpY3kgXFwnbmVnb3RpYXRlXFwnIGlzIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgfSBlbHNlIGlmICghY29uZmlnLnJ0Y3BNdXhQb2xpY3kpIHtcbiAgICAgIGNvbmZpZy5ydGNwTXV4UG9saWN5ID0gJ3JlcXVpcmUnO1xuICAgIH1cblxuICAgIHN3aXRjaCAoY29uZmlnLmljZVRyYW5zcG9ydFBvbGljeSkge1xuICAgICAgY2FzZSAnYWxsJzpcbiAgICAgIGNhc2UgJ3JlbGF5JzpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25maWcuaWNlVHJhbnNwb3J0UG9saWN5ID0gJ2FsbCc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHN3aXRjaCAoY29uZmlnLmJ1bmRsZVBvbGljeSkge1xuICAgICAgY2FzZSAnYmFsYW5jZWQnOlxuICAgICAgY2FzZSAnbWF4LWNvbXBhdCc6XG4gICAgICBjYXNlICdtYXgtYnVuZGxlJzpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25maWcuYnVuZGxlUG9saWN5ID0gJ2JhbGFuY2VkJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uZmlnLmljZVNlcnZlcnMgPSBmaWx0ZXJJY2VTZXJ2ZXJzKGNvbmZpZy5pY2VTZXJ2ZXJzIHx8IFtdLCBlZGdlVmVyc2lvbik7XG5cbiAgICB0aGlzLl9pY2VHYXRoZXJlcnMgPSBbXTtcbiAgICBpZiAoY29uZmlnLmljZUNhbmRpZGF0ZVBvb2xTaXplKSB7XG4gICAgICBmb3IgKHZhciBpID0gY29uZmlnLmljZUNhbmRpZGF0ZVBvb2xTaXplOyBpID4gMDsgaS0tKSB7XG4gICAgICAgIHRoaXMuX2ljZUdhdGhlcmVycy5wdXNoKG5ldyB3aW5kb3cuUlRDSWNlR2F0aGVyZXIoe1xuICAgICAgICAgIGljZVNlcnZlcnM6IGNvbmZpZy5pY2VTZXJ2ZXJzLFxuICAgICAgICAgIGdhdGhlclBvbGljeTogY29uZmlnLmljZVRyYW5zcG9ydFBvbGljeVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy5pY2VDYW5kaWRhdGVQb29sU2l6ZSA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5fY29uZmlnID0gY29uZmlnO1xuXG4gICAgLy8gcGVyLXRyYWNrIGljZUdhdGhlcnMsIGljZVRyYW5zcG9ydHMsIGR0bHNUcmFuc3BvcnRzLCBydHBTZW5kZXJzLCAuLi5cbiAgICAvLyBldmVyeXRoaW5nIHRoYXQgaXMgbmVlZGVkIHRvIGRlc2NyaWJlIGEgU0RQIG0tbGluZS5cbiAgICB0aGlzLnRyYW5zY2VpdmVycyA9IFtdO1xuXG4gICAgdGhpcy5fc2RwU2Vzc2lvbklkID0gU0RQVXRpbHMuZ2VuZXJhdGVTZXNzaW9uSWQoKTtcbiAgICB0aGlzLl9zZHBTZXNzaW9uVmVyc2lvbiA9IDA7XG5cbiAgICB0aGlzLl9kdGxzUm9sZSA9IHVuZGVmaW5lZDsgLy8gcm9sZSBmb3IgYT1zZXR1cCB0byB1c2UgaW4gYW5zd2Vycy5cblxuICAgIHRoaXMuX2lzQ2xvc2VkID0gZmFsc2U7XG4gIH07XG5cbiAgLy8gc2V0IHVwIGV2ZW50IGhhbmRsZXJzIG9uIHByb3RvdHlwZVxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25pY2VjYW5kaWRhdGUgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25hZGRzdHJlYW0gPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub250cmFjayA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbnJlbW92ZXN0cmVhbSA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uaWNlZ2F0aGVyaW5nc3RhdGVjaGFuZ2UgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25uZWdvdGlhdGlvbm5lZWRlZCA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbmRhdGFjaGFubmVsID0gbnVsbDtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Rpc3BhdGNoRXZlbnQgPSBmdW5jdGlvbihuYW1lLCBldmVudCkge1xuICAgIGlmICh0aGlzLl9pc0Nsb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIGlmICh0eXBlb2YgdGhpc1snb24nICsgbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXNbJ29uJyArIG5hbWVdKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2ljZWdhdGhlcmluZ3N0YXRlY2hhbmdlJyk7XG4gICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnaWNlZ2F0aGVyaW5nc3RhdGVjaGFuZ2UnLCBldmVudCk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldENvbmZpZ3VyYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRMb2NhbFN0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbFN0cmVhbXM7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlbW90ZVN0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZW1vdGVTdHJlYW1zO1xuICB9O1xuXG4gIC8vIGludGVybmFsIGhlbHBlciB0byBjcmVhdGUgYSB0cmFuc2NlaXZlciBvYmplY3QuXG4gIC8vICh3aGljaCBpcyBub3QgeWV0IHRoZSBzYW1lIGFzIHRoZSBXZWJSVEMgMS4wIHRyYW5zY2VpdmVyKVxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZVRyYW5zY2VpdmVyID0gZnVuY3Rpb24oa2luZCwgZG9Ob3RBZGQpIHtcbiAgICB2YXIgaGFzQnVuZGxlVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnMubGVuZ3RoID4gMDtcbiAgICB2YXIgdHJhbnNjZWl2ZXIgPSB7XG4gICAgICB0cmFjazogbnVsbCxcbiAgICAgIGljZUdhdGhlcmVyOiBudWxsLFxuICAgICAgaWNlVHJhbnNwb3J0OiBudWxsLFxuICAgICAgZHRsc1RyYW5zcG9ydDogbnVsbCxcbiAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzOiBudWxsLFxuICAgICAgcmVtb3RlQ2FwYWJpbGl0aWVzOiBudWxsLFxuICAgICAgcnRwU2VuZGVyOiBudWxsLFxuICAgICAgcnRwUmVjZWl2ZXI6IG51bGwsXG4gICAgICBraW5kOiBraW5kLFxuICAgICAgbWlkOiBudWxsLFxuICAgICAgc2VuZEVuY29kaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgIHJlY3ZFbmNvZGluZ1BhcmFtZXRlcnM6IG51bGwsXG4gICAgICBzdHJlYW06IG51bGwsXG4gICAgICBhc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zOiBbXSxcbiAgICAgIHdhbnRSZWNlaXZlOiB0cnVlXG4gICAgfTtcbiAgICBpZiAodGhpcy51c2luZ0J1bmRsZSAmJiBoYXNCdW5kbGVUcmFuc3BvcnQpIHtcbiAgICAgIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCA9IHRoaXMudHJhbnNjZWl2ZXJzWzBdLmljZVRyYW5zcG9ydDtcbiAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQgPSB0aGlzLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdHJhbnNwb3J0cyA9IHRoaXMuX2NyZWF0ZUljZUFuZER0bHNUcmFuc3BvcnRzKCk7XG4gICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQgPSB0cmFuc3BvcnRzLmljZVRyYW5zcG9ydDtcbiAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQgPSB0cmFuc3BvcnRzLmR0bHNUcmFuc3BvcnQ7XG4gICAgfVxuICAgIGlmICghZG9Ob3RBZGQpIHtcbiAgICAgIHRoaXMudHJhbnNjZWl2ZXJzLnB1c2godHJhbnNjZWl2ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNjZWl2ZXI7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24odHJhY2ssIHN0cmVhbSkge1xuICAgIGlmICh0aGlzLl9pc0Nsb3NlZCkge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0F0dGVtcHRlZCB0byBjYWxsIGFkZFRyYWNrIG9uIGEgY2xvc2VkIHBlZXJjb25uZWN0aW9uLicpO1xuICAgIH1cblxuICAgIHZhciBhbHJlYWR5RXhpc3RzID0gdGhpcy50cmFuc2NlaXZlcnMuZmluZChmdW5jdGlvbihzKSB7XG4gICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgfSk7XG5cbiAgICBpZiAoYWxyZWFkeUV4aXN0cykge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkQWNjZXNzRXJyb3InLCAnVHJhY2sgYWxyZWFkeSBleGlzdHMuJyk7XG4gICAgfVxuXG4gICAgdmFyIHRyYW5zY2VpdmVyO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmFuc2NlaXZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy50cmFuc2NlaXZlcnNbaV0udHJhY2sgJiZcbiAgICAgICAgICB0aGlzLnRyYW5zY2VpdmVyc1tpXS5raW5kID09PSB0cmFjay5raW5kKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyID0gdGhpcy50cmFuc2NlaXZlcnNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdHJhbnNjZWl2ZXIpIHtcbiAgICAgIHRyYW5zY2VpdmVyID0gdGhpcy5fY3JlYXRlVHJhbnNjZWl2ZXIodHJhY2sua2luZCk7XG4gICAgfVxuXG4gICAgdGhpcy5fbWF5YmVGaXJlTmVnb3RpYXRpb25OZWVkZWQoKTtcblxuICAgIGlmICh0aGlzLmxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPT09IC0xKSB7XG4gICAgICB0aGlzLmxvY2FsU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgfVxuXG4gICAgdHJhbnNjZWl2ZXIudHJhY2sgPSB0cmFjaztcbiAgICB0cmFuc2NlaXZlci5zdHJlYW0gPSBzdHJlYW07XG4gICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyID0gbmV3IHdpbmRvdy5SVENSdHBTZW5kZXIodHJhY2ssXG4gICAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQpO1xuICAgIHJldHVybiB0cmFuc2NlaXZlci5ydHBTZW5kZXI7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgaWYgKGVkZ2VWZXJzaW9uID49IDE1MDI1KSB7XG4gICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0cmFjaykge1xuICAgICAgICBwYy5hZGRUcmFjayh0cmFjaywgc3RyZWFtKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDbG9uZSBpcyBuZWNlc3NhcnkgZm9yIGxvY2FsIGRlbW9zIG1vc3RseSwgYXR0YWNoaW5nIGRpcmVjdGx5XG4gICAgICAvLyB0byB0d28gZGlmZmVyZW50IHNlbmRlcnMgZG9lcyBub3Qgd29yayAoYnVpbGQgMTA1NDcpLlxuICAgICAgLy8gRml4ZWQgaW4gMTUwMjUgKG9yIGVhcmxpZXIpXG4gICAgICB2YXIgY2xvbmVkU3RyZWFtID0gc3RyZWFtLmNsb25lKCk7XG4gICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0cmFjaywgaWR4KSB7XG4gICAgICAgIHZhciBjbG9uZWRUcmFjayA9IGNsb25lZFN0cmVhbS5nZXRUcmFja3MoKVtpZHhdO1xuICAgICAgICB0cmFjay5hZGRFdmVudExpc3RlbmVyKCdlbmFibGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBjbG9uZWRUcmFjay5lbmFibGVkID0gZXZlbnQuZW5hYmxlZDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGNsb25lZFN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgIHBjLmFkZFRyYWNrKHRyYWNrLCBjbG9uZWRTdHJlYW0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVUcmFjayA9IGZ1bmN0aW9uKHNlbmRlcikge1xuICAgIGlmICh0aGlzLl9pc0Nsb3NlZCkge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0F0dGVtcHRlZCB0byBjYWxsIHJlbW92ZVRyYWNrIG9uIGEgY2xvc2VkIHBlZXJjb25uZWN0aW9uLicpO1xuICAgIH1cblxuICAgIGlmICghKHNlbmRlciBpbnN0YW5jZW9mIHdpbmRvdy5SVENSdHBTZW5kZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCAxIG9mIFJUQ1BlZXJDb25uZWN0aW9uLnJlbW92ZVRyYWNrICcgK1xuICAgICAgICAgICdkb2VzIG5vdCBpbXBsZW1lbnQgaW50ZXJmYWNlIFJUQ1J0cFNlbmRlci4nKTtcbiAgICB9XG5cbiAgICB2YXIgdHJhbnNjZWl2ZXIgPSB0aGlzLnRyYW5zY2VpdmVycy5maW5kKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0LnJ0cFNlbmRlciA9PT0gc2VuZGVyO1xuICAgIH0pO1xuXG4gICAgaWYgKCF0cmFuc2NlaXZlcikge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkQWNjZXNzRXJyb3InLFxuICAgICAgICAgICdTZW5kZXIgd2FzIG5vdCBjcmVhdGVkIGJ5IHRoaXMgY29ubmVjdGlvbi4nKTtcbiAgICB9XG4gICAgdmFyIHN0cmVhbSA9IHRyYW5zY2VpdmVyLnN0cmVhbTtcblxuICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5zdG9wKCk7XG4gICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyID0gbnVsbDtcbiAgICB0cmFuc2NlaXZlci50cmFjayA9IG51bGw7XG4gICAgdHJhbnNjZWl2ZXIuc3RyZWFtID0gbnVsbDtcblxuICAgIC8vIHJlbW92ZSB0aGUgc3RyZWFtIGZyb20gdGhlIHNldCBvZiBsb2NhbCBzdHJlYW1zXG4gICAgdmFyIGxvY2FsU3RyZWFtcyA9IHRoaXMudHJhbnNjZWl2ZXJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gdC5zdHJlYW07XG4gICAgfSk7XG4gICAgaWYgKGxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPT09IC0xICYmXG4gICAgICAgIHRoaXMubG9jYWxTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKSA+IC0xKSB7XG4gICAgICB0aGlzLmxvY2FsU3RyZWFtcy5zcGxpY2UodGhpcy5sb2NhbFN0cmVhbXMuaW5kZXhPZihzdHJlYW0pLCAxKTtcbiAgICB9XG5cbiAgICB0aGlzLl9tYXliZUZpcmVOZWdvdGlhdGlvbk5lZWRlZCgpO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICB2YXIgc2VuZGVyID0gcGMuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24ocykge1xuICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICB9KTtcbiAgICAgIGlmIChzZW5kZXIpIHtcbiAgICAgICAgcGMucmVtb3ZlVHJhY2soc2VuZGVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zY2VpdmVycy5maWx0ZXIoZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHJldHVybiAhIXRyYW5zY2VpdmVyLnJ0cFNlbmRlcjtcbiAgICB9KVxuICAgIC5tYXAoZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0cmFuc2NlaXZlci5ydHBTZW5kZXI7XG4gICAgfSk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zY2VpdmVycy5maWx0ZXIoZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHJldHVybiAhIXRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgcmV0dXJuIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgIH0pO1xuICB9O1xuXG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVJY2VHYXRoZXJlciA9IGZ1bmN0aW9uKHNkcE1MaW5lSW5kZXgsXG4gICAgICB1c2luZ0J1bmRsZSkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgaWYgKHVzaW5nQnVuZGxlICYmIHNkcE1MaW5lSW5kZXggPiAwKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmFuc2NlaXZlcnNbMF0uaWNlR2F0aGVyZXI7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9pY2VHYXRoZXJlcnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5faWNlR2F0aGVyZXJzLnNoaWZ0KCk7XG4gICAgfVxuICAgIHZhciBpY2VHYXRoZXJlciA9IG5ldyB3aW5kb3cuUlRDSWNlR2F0aGVyZXIoe1xuICAgICAgaWNlU2VydmVyczogdGhpcy5fY29uZmlnLmljZVNlcnZlcnMsXG4gICAgICBnYXRoZXJQb2xpY3k6IHRoaXMuX2NvbmZpZy5pY2VUcmFuc3BvcnRQb2xpY3lcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaWNlR2F0aGVyZXIsICdzdGF0ZScsXG4gICAgICAgIHt2YWx1ZTogJ25ldycsIHdyaXRhYmxlOiB0cnVlfVxuICAgICk7XG5cbiAgICB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cyA9IFtdO1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlckNhbmRpZGF0ZXMgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIGVuZCA9ICFldmVudC5jYW5kaWRhdGUgfHwgT2JqZWN0LmtleXMoZXZlbnQuY2FuZGlkYXRlKS5sZW5ndGggPT09IDA7XG4gICAgICAvLyBwb2x5ZmlsbCBzaW5jZSBSVENJY2VHYXRoZXJlci5zdGF0ZSBpcyBub3QgaW1wbGVtZW50ZWQgaW5cbiAgICAgIC8vIEVkZ2UgMTA1NDcgeWV0LlxuICAgICAgaWNlR2F0aGVyZXIuc3RhdGUgPSBlbmQgPyAnY29tcGxldGVkJyA6ICdnYXRoZXJpbmcnO1xuICAgICAgaWYgKHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cyAhPT0gbnVsbCkge1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyZWRDYW5kaWRhdGVFdmVudHMucHVzaChldmVudCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpY2VHYXRoZXJlci5hZGRFdmVudExpc3RlbmVyKCdsb2NhbGNhbmRpZGF0ZScsXG4gICAgICB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJDYW5kaWRhdGVzKTtcbiAgICByZXR1cm4gaWNlR2F0aGVyZXI7XG4gIH07XG5cbiAgLy8gc3RhcnQgZ2F0aGVyaW5nIGZyb20gYW4gUlRDSWNlR2F0aGVyZXIuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fZ2F0aGVyID0gZnVuY3Rpb24obWlkLCBzZHBNTGluZUluZGV4KSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICB2YXIgaWNlR2F0aGVyZXIgPSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VHYXRoZXJlcjtcbiAgICBpZiAoaWNlR2F0aGVyZXIub25sb2NhbGNhbmRpZGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYnVmZmVyZWRDYW5kaWRhdGVFdmVudHMgPVxuICAgICAgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyZWRDYW5kaWRhdGVFdmVudHM7XG4gICAgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyZWRDYW5kaWRhdGVFdmVudHMgPSBudWxsO1xuICAgIGljZUdhdGhlcmVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvY2FsY2FuZGlkYXRlJyxcbiAgICAgIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlckNhbmRpZGF0ZXMpO1xuICAgIGljZUdhdGhlcmVyLm9ubG9jYWxjYW5kaWRhdGUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgIGlmIChwYy51c2luZ0J1bmRsZSAmJiBzZHBNTGluZUluZGV4ID4gMCkge1xuICAgICAgICAvLyBpZiB3ZSBrbm93IHRoYXQgd2UgdXNlIGJ1bmRsZSB3ZSBjYW4gZHJvcCBjYW5kaWRhdGVzIHdpdGhcbiAgICAgICAgLy8g0ZVkcE1MaW5lSW5kZXggPiAwLiBJZiB3ZSBkb24ndCBkbyB0aGlzIHRoZW4gb3VyIHN0YXRlIGdldHNcbiAgICAgICAgLy8gY29uZnVzZWQgc2luY2Ugd2UgZGlzcG9zZSB0aGUgZXh0cmEgaWNlIGdhdGhlcmVyLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2ljZWNhbmRpZGF0ZScpO1xuICAgICAgZXZlbnQuY2FuZGlkYXRlID0ge3NkcE1pZDogbWlkLCBzZHBNTGluZUluZGV4OiBzZHBNTGluZUluZGV4fTtcblxuICAgICAgdmFyIGNhbmQgPSBldnQuY2FuZGlkYXRlO1xuICAgICAgLy8gRWRnZSBlbWl0cyBhbiBlbXB0eSBvYmplY3QgZm9yIFJUQ0ljZUNhbmRpZGF0ZUNvbXBsZXRl4oClXG4gICAgICB2YXIgZW5kID0gIWNhbmQgfHwgT2JqZWN0LmtleXMoY2FuZCkubGVuZ3RoID09PSAwO1xuICAgICAgaWYgKGVuZCkge1xuICAgICAgICAvLyBwb2x5ZmlsbCBzaW5jZSBSVENJY2VHYXRoZXJlci5zdGF0ZSBpcyBub3QgaW1wbGVtZW50ZWQgaW5cbiAgICAgICAgLy8gRWRnZSAxMDU0NyB5ZXQuXG4gICAgICAgIGlmIChpY2VHYXRoZXJlci5zdGF0ZSA9PT0gJ25ldycgfHwgaWNlR2F0aGVyZXIuc3RhdGUgPT09ICdnYXRoZXJpbmcnKSB7XG4gICAgICAgICAgaWNlR2F0aGVyZXIuc3RhdGUgPSAnY29tcGxldGVkJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGljZUdhdGhlcmVyLnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgIGljZUdhdGhlcmVyLnN0YXRlID0gJ2dhdGhlcmluZyc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUlRDSWNlQ2FuZGlkYXRlIGRvZXNuJ3QgaGF2ZSBhIGNvbXBvbmVudCwgbmVlZHMgdG8gYmUgYWRkZWRcbiAgICAgICAgY2FuZC5jb21wb25lbnQgPSAxO1xuICAgICAgICAvLyBhbHNvIHRoZSB1c2VybmFtZUZyYWdtZW50LiBUT0RPOiB1cGRhdGUgU0RQIHRvIHRha2UgYm90aCB2YXJpYW50cy5cbiAgICAgICAgY2FuZC51ZnJhZyA9IGljZUdhdGhlcmVyLmdldExvY2FsUGFyYW1ldGVycygpLnVzZXJuYW1lRnJhZ21lbnQ7XG5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZWRDYW5kaWRhdGUgPSBTRFBVdGlscy53cml0ZUNhbmRpZGF0ZShjYW5kKTtcbiAgICAgICAgZXZlbnQuY2FuZGlkYXRlID0gT2JqZWN0LmFzc2lnbihldmVudC5jYW5kaWRhdGUsXG4gICAgICAgICAgICBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShzZXJpYWxpemVkQ2FuZGlkYXRlKSk7XG5cbiAgICAgICAgZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSA9IHNlcmlhbGl6ZWRDYW5kaWRhdGU7XG4gICAgICAgIGV2ZW50LmNhbmRpZGF0ZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2FuZGlkYXRlOiBldmVudC5jYW5kaWRhdGUuY2FuZGlkYXRlLFxuICAgICAgICAgICAgc2RwTWlkOiBldmVudC5jYW5kaWRhdGUuc2RwTWlkLFxuICAgICAgICAgICAgc2RwTUxpbmVJbmRleDogZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXgsXG4gICAgICAgICAgICB1c2VybmFtZUZyYWdtZW50OiBldmVudC5jYW5kaWRhdGUudXNlcm5hbWVGcmFnbWVudFxuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhbCBkZXNjcmlwdGlvbi5cbiAgICAgIHZhciBzZWN0aW9ucyA9IFNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMocGMubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgaWYgKCFlbmQpIHtcbiAgICAgICAgc2VjdGlvbnNbZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXhdICs9XG4gICAgICAgICAgICAnYT0nICsgZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSArICdcXHJcXG4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VjdGlvbnNbZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXhdICs9XG4gICAgICAgICAgICAnYT1lbmQtb2YtY2FuZGlkYXRlc1xcclxcbic7XG4gICAgICB9XG4gICAgICBwYy5sb2NhbERlc2NyaXB0aW9uLnNkcCA9XG4gICAgICAgICAgU0RQVXRpbHMuZ2V0RGVzY3JpcHRpb24ocGMubG9jYWxEZXNjcmlwdGlvbi5zZHApICtcbiAgICAgICAgICBzZWN0aW9ucy5qb2luKCcnKTtcbiAgICAgIHZhciBjb21wbGV0ZSA9IHBjLnRyYW5zY2VpdmVycy5ldmVyeShmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgICByZXR1cm4gdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIgJiZcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLnN0YXRlID09PSAnY29tcGxldGVkJztcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocGMuaWNlR2F0aGVyaW5nU3RhdGUgIT09ICdnYXRoZXJpbmcnKSB7XG4gICAgICAgIHBjLmljZUdhdGhlcmluZ1N0YXRlID0gJ2dhdGhlcmluZyc7XG4gICAgICAgIHBjLl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UoKTtcbiAgICAgIH1cblxuICAgICAgLy8gRW1pdCBjYW5kaWRhdGUuIEFsc28gZW1pdCBudWxsIGNhbmRpZGF0ZSB3aGVuIGFsbCBnYXRoZXJlcnMgYXJlXG4gICAgICAvLyBjb21wbGV0ZS5cbiAgICAgIGlmICghZW5kKSB7XG4gICAgICAgIHBjLl9kaXNwYXRjaEV2ZW50KCdpY2VjYW5kaWRhdGUnLCBldmVudCk7XG4gICAgICB9XG4gICAgICBpZiAoY29tcGxldGUpIHtcbiAgICAgICAgcGMuX2Rpc3BhdGNoRXZlbnQoJ2ljZWNhbmRpZGF0ZScsIG5ldyBFdmVudCgnaWNlY2FuZGlkYXRlJykpO1xuICAgICAgICBwYy5pY2VHYXRoZXJpbmdTdGF0ZSA9ICdjb21wbGV0ZSc7XG4gICAgICAgIHBjLl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZW1pdCBhbHJlYWR5IGdhdGhlcmVkIGNhbmRpZGF0ZXMuXG4gICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBidWZmZXJlZENhbmRpZGF0ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWNlR2F0aGVyZXIub25sb2NhbGNhbmRpZGF0ZShlKTtcbiAgICAgIH0pO1xuICAgIH0sIDApO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBJQ0UgdHJhbnNwb3J0IGFuZCBEVExTIHRyYW5zcG9ydC5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVJY2VBbmREdGxzVHJhbnNwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgdmFyIGljZVRyYW5zcG9ydCA9IG5ldyB3aW5kb3cuUlRDSWNlVHJhbnNwb3J0KG51bGwpO1xuICAgIGljZVRyYW5zcG9ydC5vbmljZXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBwYy5fdXBkYXRlSWNlQ29ubmVjdGlvblN0YXRlKCk7XG4gICAgICBwYy5fdXBkYXRlQ29ubmVjdGlvblN0YXRlKCk7XG4gICAgfTtcblxuICAgIHZhciBkdGxzVHJhbnNwb3J0ID0gbmV3IHdpbmRvdy5SVENEdGxzVHJhbnNwb3J0KGljZVRyYW5zcG9ydCk7XG4gICAgZHRsc1RyYW5zcG9ydC5vbmR0bHNzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcGMuX3VwZGF0ZUNvbm5lY3Rpb25TdGF0ZSgpO1xuICAgIH07XG4gICAgZHRsc1RyYW5zcG9ydC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBvbmVycm9yIGRvZXMgbm90IHNldCBzdGF0ZSB0byBmYWlsZWQgYnkgaXRzZWxmLlxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGR0bHNUcmFuc3BvcnQsICdzdGF0ZScsXG4gICAgICAgICAge3ZhbHVlOiAnZmFpbGVkJywgd3JpdGFibGU6IHRydWV9KTtcbiAgICAgIHBjLl91cGRhdGVDb25uZWN0aW9uU3RhdGUoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGljZVRyYW5zcG9ydDogaWNlVHJhbnNwb3J0LFxuICAgICAgZHRsc1RyYW5zcG9ydDogZHRsc1RyYW5zcG9ydFxuICAgIH07XG4gIH07XG5cbiAgLy8gRGVzdHJveSBJQ0UgZ2F0aGVyZXIsIElDRSB0cmFuc3BvcnQgYW5kIERUTFMgdHJhbnNwb3J0LlxuICAvLyBXaXRob3V0IHRyaWdnZXJpbmcgdGhlIGNhbGxiYWNrcy5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9kaXNwb3NlSWNlQW5kRHRsc1RyYW5zcG9ydHMgPSBmdW5jdGlvbihcbiAgICAgIHNkcE1MaW5lSW5kZXgpIHtcbiAgICB2YXIgaWNlR2F0aGVyZXIgPSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VHYXRoZXJlcjtcbiAgICBpZiAoaWNlR2F0aGVyZXIpIHtcbiAgICAgIGRlbGV0ZSBpY2VHYXRoZXJlci5vbmxvY2FsY2FuZGlkYXRlO1xuICAgICAgZGVsZXRlIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmljZUdhdGhlcmVyO1xuICAgIH1cbiAgICB2YXIgaWNlVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlVHJhbnNwb3J0O1xuICAgIGlmIChpY2VUcmFuc3BvcnQpIHtcbiAgICAgIGRlbGV0ZSBpY2VUcmFuc3BvcnQub25pY2VzdGF0ZWNoYW5nZTtcbiAgICAgIGRlbGV0ZSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VUcmFuc3BvcnQ7XG4gICAgfVxuICAgIHZhciBkdGxzVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uZHRsc1RyYW5zcG9ydDtcbiAgICBpZiAoZHRsc1RyYW5zcG9ydCkge1xuICAgICAgZGVsZXRlIGR0bHNUcmFuc3BvcnQub25kdGxzc3RhdGVjaGFuZ2U7XG4gICAgICBkZWxldGUgZHRsc1RyYW5zcG9ydC5vbmVycm9yO1xuICAgICAgZGVsZXRlIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmR0bHNUcmFuc3BvcnQ7XG4gICAgfVxuICB9O1xuXG4gIC8vIFN0YXJ0IHRoZSBSVFAgU2VuZGVyIGFuZCBSZWNlaXZlciBmb3IgYSB0cmFuc2NlaXZlci5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl90cmFuc2NlaXZlID0gZnVuY3Rpb24odHJhbnNjZWl2ZXIsXG4gICAgICBzZW5kLCByZWN2KSB7XG4gICAgdmFyIHBhcmFtcyA9IGdldENvbW1vbkNhcGFiaWxpdGllcyh0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyxcbiAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzKTtcbiAgICBpZiAoc2VuZCAmJiB0cmFuc2NlaXZlci5ydHBTZW5kZXIpIHtcbiAgICAgIHBhcmFtcy5lbmNvZGluZ3MgPSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgcGFyYW1zLnJ0Y3AgPSB7XG4gICAgICAgIGNuYW1lOiBTRFBVdGlscy5sb2NhbENOYW1lLFxuICAgICAgICBjb21wb3VuZDogdHJhbnNjZWl2ZXIucnRjcFBhcmFtZXRlcnMuY29tcG91bmRcbiAgICAgIH07XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVycy5sZW5ndGgpIHtcbiAgICAgICAgcGFyYW1zLnJ0Y3Auc3NyYyA9IHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYztcbiAgICAgIH1cbiAgICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5zZW5kKHBhcmFtcyk7XG4gICAgfVxuICAgIGlmIChyZWN2ICYmIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyICYmIHBhcmFtcy5jb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gcmVtb3ZlIFJUWCBmaWVsZCBpbiBFZGdlIDE0OTQyXG4gICAgICBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ3ZpZGVvJ1xuICAgICAgICAgICYmIHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnNcbiAgICAgICAgICAmJiBlZGdlVmVyc2lvbiA8IDE1MDE5KSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnMuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgZGVsZXRlIHAucnR4O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmFuc2NlaXZlci5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgICBwYXJhbXMuZW5jb2RpbmdzID0gdHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy5lbmNvZGluZ3MgPSBbe31dO1xuICAgICAgfVxuICAgICAgcGFyYW1zLnJ0Y3AgPSB7XG4gICAgICAgIGNvbXBvdW5kOiB0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycy5jb21wb3VuZFxuICAgICAgfTtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycy5jbmFtZSkge1xuICAgICAgICBwYXJhbXMucnRjcC5jbmFtZSA9IHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzLmNuYW1lO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHBhcmFtcy5ydGNwLnNzcmMgPSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmM7XG4gICAgICB9XG4gICAgICB0cmFuc2NlaXZlci5ydHBSZWNlaXZlci5yZWNlaXZlKHBhcmFtcyk7XG4gICAgfVxuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuXG4gICAgLy8gTm90ZTogcHJhbnN3ZXIgaXMgbm90IHN1cHBvcnRlZC5cbiAgICBpZiAoWydvZmZlcicsICdhbnN3ZXInXS5pbmRleE9mKGRlc2NyaXB0aW9uLnR5cGUpID09PSAtMSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignVHlwZUVycm9yJyxcbiAgICAgICAgICAnVW5zdXBwb3J0ZWQgdHlwZSBcIicgKyBkZXNjcmlwdGlvbi50eXBlICsgJ1wiJykpO1xuICAgIH1cblxuICAgIGlmICghaXNBY3Rpb25BbGxvd2VkSW5TaWduYWxpbmdTdGF0ZSgnc2V0TG9jYWxEZXNjcmlwdGlvbicsXG4gICAgICAgIGRlc2NyaXB0aW9uLnR5cGUsIHBjLnNpZ25hbGluZ1N0YXRlKSB8fCBwYy5faXNDbG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQ2FuIG5vdCBzZXQgbG9jYWwgJyArIGRlc2NyaXB0aW9uLnR5cGUgK1xuICAgICAgICAgICcgaW4gc3RhdGUgJyArIHBjLnNpZ25hbGluZ1N0YXRlKSk7XG4gICAgfVxuXG4gICAgdmFyIHNlY3Rpb25zO1xuICAgIHZhciBzZXNzaW9ucGFydDtcbiAgICBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJ29mZmVyJykge1xuICAgICAgLy8gVkVSWSBsaW1pdGVkIHN1cHBvcnQgZm9yIFNEUCBtdW5naW5nLiBMaW1pdGVkIHRvOlxuICAgICAgLy8gKiBjaGFuZ2luZyB0aGUgb3JkZXIgb2YgY29kZWNzXG4gICAgICBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMoZGVzY3JpcHRpb24uc2RwKTtcbiAgICAgIHNlc3Npb25wYXJ0ID0gc2VjdGlvbnMuc2hpZnQoKTtcbiAgICAgIHNlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICAgIHZhciBjYXBzID0gU0RQVXRpbHMucGFyc2VSdHBQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbik7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5sb2NhbENhcGFiaWxpdGllcyA9IGNhcHM7XG4gICAgICB9KTtcblxuICAgICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIsIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgICAgcGMuX2dhdGhlcih0cmFuc2NlaXZlci5taWQsIHNkcE1MaW5lSW5kZXgpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnYW5zd2VyJykge1xuICAgICAgc2VjdGlvbnMgPSBTRFBVdGlscy5zcGxpdFNlY3Rpb25zKHBjLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICBzZXNzaW9ucGFydCA9IHNlY3Rpb25zLnNoaWZ0KCk7XG4gICAgICB2YXIgaXNJY2VMaXRlID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoc2Vzc2lvbnBhcnQsXG4gICAgICAgICAgJ2E9aWNlLWxpdGUnKS5sZW5ndGggPiAwO1xuICAgICAgc2VjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgICAgdmFyIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdO1xuICAgICAgICB2YXIgaWNlR2F0aGVyZXIgPSB0cmFuc2NlaXZlci5pY2VHYXRoZXJlcjtcbiAgICAgICAgdmFyIGljZVRyYW5zcG9ydCA9IHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydDtcbiAgICAgICAgdmFyIGR0bHNUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0O1xuICAgICAgICB2YXIgbG9jYWxDYXBhYmlsaXRpZXMgPSB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcztcbiAgICAgICAgdmFyIHJlbW90ZUNhcGFiaWxpdGllcyA9IHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcztcblxuICAgICAgICAvLyB0cmVhdCBidW5kbGUtb25seSBhcyBub3QtcmVqZWN0ZWQuXG4gICAgICAgIHZhciByZWplY3RlZCA9IFNEUFV0aWxzLmlzUmVqZWN0ZWQobWVkaWFTZWN0aW9uKSAmJlxuICAgICAgICAgICAgU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1idW5kbGUtb25seScpLmxlbmd0aCA9PT0gMDtcblxuICAgICAgICBpZiAoIXJlamVjdGVkICYmICF0cmFuc2NlaXZlci5yZWplY3RlZCkge1xuICAgICAgICAgIHZhciByZW1vdGVJY2VQYXJhbWV0ZXJzID0gU0RQVXRpbHMuZ2V0SWNlUGFyYW1ldGVycyhcbiAgICAgICAgICAgICAgbWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCk7XG4gICAgICAgICAgdmFyIHJlbW90ZUR0bHNQYXJhbWV0ZXJzID0gU0RQVXRpbHMuZ2V0RHRsc1BhcmFtZXRlcnMoXG4gICAgICAgICAgICAgIG1lZGlhU2VjdGlvbiwgc2Vzc2lvbnBhcnQpO1xuICAgICAgICAgIGlmIChpc0ljZUxpdGUpIHtcbiAgICAgICAgICAgIHJlbW90ZUR0bHNQYXJhbWV0ZXJzLnJvbGUgPSAnc2VydmVyJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXBjLnVzaW5nQnVuZGxlIHx8IHNkcE1MaW5lSW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIHBjLl9nYXRoZXIodHJhbnNjZWl2ZXIubWlkLCBzZHBNTGluZUluZGV4KTtcbiAgICAgICAgICAgIGlmIChpY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAgIGljZVRyYW5zcG9ydC5zdGFydChpY2VHYXRoZXJlciwgcmVtb3RlSWNlUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgIGlzSWNlTGl0ZSA/ICdjb250cm9sbGluZycgOiAnY29udHJvbGxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGR0bHNUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAgIGR0bHNUcmFuc3BvcnQuc3RhcnQocmVtb3RlRHRsc1BhcmFtZXRlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENhbGN1bGF0ZSBpbnRlcnNlY3Rpb24gb2YgY2FwYWJpbGl0aWVzLlxuICAgICAgICAgIHZhciBwYXJhbXMgPSBnZXRDb21tb25DYXBhYmlsaXRpZXMobG9jYWxDYXBhYmlsaXRpZXMsXG4gICAgICAgICAgICAgIHJlbW90ZUNhcGFiaWxpdGllcyk7XG5cbiAgICAgICAgICAvLyBTdGFydCB0aGUgUlRDUnRwU2VuZGVyLiBUaGUgUlRDUnRwUmVjZWl2ZXIgZm9yIHRoaXNcbiAgICAgICAgICAvLyB0cmFuc2NlaXZlciBoYXMgYWxyZWFkeSBiZWVuIHN0YXJ0ZWQgaW4gc2V0UmVtb3RlRGVzY3JpcHRpb24uXG4gICAgICAgICAgcGMuX3RyYW5zY2VpdmUodHJhbnNjZWl2ZXIsXG4gICAgICAgICAgICAgIHBhcmFtcy5jb2RlY3MubGVuZ3RoID4gMCxcbiAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBwYy5sb2NhbERlc2NyaXB0aW9uID0ge1xuICAgICAgdHlwZTogZGVzY3JpcHRpb24udHlwZSxcbiAgICAgIHNkcDogZGVzY3JpcHRpb24uc2RwXG4gICAgfTtcbiAgICBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJ29mZmVyJykge1xuICAgICAgcGMuX3VwZGF0ZVNpZ25hbGluZ1N0YXRlKCdoYXZlLWxvY2FsLW9mZmVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBjLl91cGRhdGVTaWduYWxpbmdTdGF0ZSgnc3RhYmxlJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIHBjID0gdGhpcztcblxuICAgIC8vIE5vdGU6IHByYW5zd2VyIGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAgaWYgKFsnb2ZmZXInLCAnYW5zd2VyJ10uaW5kZXhPZihkZXNjcmlwdGlvbi50eXBlKSA9PT0gLTEpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ1R5cGVFcnJvcicsXG4gICAgICAgICAgJ1Vuc3VwcG9ydGVkIHR5cGUgXCInICsgZGVzY3JpcHRpb24udHlwZSArICdcIicpKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzQWN0aW9uQWxsb3dlZEluU2lnbmFsaW5nU3RhdGUoJ3NldFJlbW90ZURlc2NyaXB0aW9uJyxcbiAgICAgICAgZGVzY3JpcHRpb24udHlwZSwgcGMuc2lnbmFsaW5nU3RhdGUpIHx8IHBjLl9pc0Nsb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignSW52YWxpZFN0YXRlRXJyb3InLFxuICAgICAgICAgICdDYW4gbm90IHNldCByZW1vdGUgJyArIGRlc2NyaXB0aW9uLnR5cGUgK1xuICAgICAgICAgICcgaW4gc3RhdGUgJyArIHBjLnNpZ25hbGluZ1N0YXRlKSk7XG4gICAgfVxuXG4gICAgdmFyIHN0cmVhbXMgPSB7fTtcbiAgICBwYy5yZW1vdGVTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBzdHJlYW1zW3N0cmVhbS5pZF0gPSBzdHJlYW07XG4gICAgfSk7XG4gICAgdmFyIHJlY2VpdmVyTGlzdCA9IFtdO1xuICAgIHZhciBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMoZGVzY3JpcHRpb24uc2RwKTtcbiAgICB2YXIgc2Vzc2lvbnBhcnQgPSBzZWN0aW9ucy5zaGlmdCgpO1xuICAgIHZhciBpc0ljZUxpdGUgPSBTRFBVdGlscy5tYXRjaFByZWZpeChzZXNzaW9ucGFydCxcbiAgICAgICAgJ2E9aWNlLWxpdGUnKS5sZW5ndGggPiAwO1xuICAgIHZhciB1c2luZ0J1bmRsZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KHNlc3Npb25wYXJ0LFxuICAgICAgICAnYT1ncm91cDpCVU5ETEUgJykubGVuZ3RoID4gMDtcbiAgICBwYy51c2luZ0J1bmRsZSA9IHVzaW5nQnVuZGxlO1xuICAgIHZhciBpY2VPcHRpb25zID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoc2Vzc2lvbnBhcnQsXG4gICAgICAgICdhPWljZS1vcHRpb25zOicpWzBdO1xuICAgIGlmIChpY2VPcHRpb25zKSB7XG4gICAgICBwYy5jYW5Ucmlja2xlSWNlQ2FuZGlkYXRlcyA9IGljZU9wdGlvbnMuc3Vic3RyKDE0KS5zcGxpdCgnICcpXG4gICAgICAgICAgLmluZGV4T2YoJ3RyaWNrbGUnKSA+PSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYy5jYW5Ucmlja2xlSWNlQ2FuZGlkYXRlcyA9IGZhbHNlO1xuICAgIH1cblxuICAgIHNlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gICAgICB2YXIga2luZCA9IFNEUFV0aWxzLmdldEtpbmQobWVkaWFTZWN0aW9uKTtcbiAgICAgIC8vIHRyZWF0IGJ1bmRsZS1vbmx5IGFzIG5vdC1yZWplY3RlZC5cbiAgICAgIHZhciByZWplY3RlZCA9IFNEUFV0aWxzLmlzUmVqZWN0ZWQobWVkaWFTZWN0aW9uKSAmJlxuICAgICAgICAgIFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9YnVuZGxlLW9ubHknKS5sZW5ndGggPT09IDA7XG4gICAgICB2YXIgcHJvdG9jb2wgPSBsaW5lc1swXS5zdWJzdHIoMikuc3BsaXQoJyAnKVsyXTtcblxuICAgICAgdmFyIGRpcmVjdGlvbiA9IFNEUFV0aWxzLmdldERpcmVjdGlvbihtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KTtcbiAgICAgIHZhciByZW1vdGVNc2lkID0gU0RQVXRpbHMucGFyc2VNc2lkKG1lZGlhU2VjdGlvbik7XG5cbiAgICAgIHZhciBtaWQgPSBTRFBVdGlscy5nZXRNaWQobWVkaWFTZWN0aW9uKSB8fCBTRFBVdGlscy5nZW5lcmF0ZUlkZW50aWZpZXIoKTtcblxuICAgICAgLy8gUmVqZWN0IGRhdGFjaGFubmVscyB3aGljaCBhcmUgbm90IGltcGxlbWVudGVkIHlldC5cbiAgICAgIGlmICgoa2luZCA9PT0gJ2FwcGxpY2F0aW9uJyAmJiBwcm90b2NvbCA9PT0gJ0RUTFMvU0NUUCcpIHx8IHJlamVjdGVkKSB7XG4gICAgICAgIC8vIFRPRE86IHRoaXMgaXMgZGFuZ2Vyb3VzIGluIHRoZSBjYXNlIHdoZXJlIGEgbm9uLXJlamVjdGVkIG0tbGluZVxuICAgICAgICAvLyAgICAgYmVjb21lcyByZWplY3RlZC5cbiAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdID0ge1xuICAgICAgICAgIG1pZDogbWlkLFxuICAgICAgICAgIGtpbmQ6IGtpbmQsXG4gICAgICAgICAgcmVqZWN0ZWQ6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJlamVjdGVkICYmIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSAmJlxuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5yZWplY3RlZCkge1xuICAgICAgICAvLyByZWN5Y2xlIGEgcmVqZWN0ZWQgdHJhbnNjZWl2ZXIuXG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSA9IHBjLl9jcmVhdGVUcmFuc2NlaXZlcihraW5kLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHRyYW5zY2VpdmVyO1xuICAgICAgdmFyIGljZUdhdGhlcmVyO1xuICAgICAgdmFyIGljZVRyYW5zcG9ydDtcbiAgICAgIHZhciBkdGxzVHJhbnNwb3J0O1xuICAgICAgdmFyIHJ0cFJlY2VpdmVyO1xuICAgICAgdmFyIHNlbmRFbmNvZGluZ1BhcmFtZXRlcnM7XG4gICAgICB2YXIgcmVjdkVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgIHZhciBsb2NhbENhcGFiaWxpdGllcztcblxuICAgICAgdmFyIHRyYWNrO1xuICAgICAgLy8gRklYTUU6IGVuc3VyZSB0aGUgbWVkaWFTZWN0aW9uIGhhcyBydGNwLW11eCBzZXQuXG4gICAgICB2YXIgcmVtb3RlQ2FwYWJpbGl0aWVzID0gU0RQVXRpbHMucGFyc2VSdHBQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbik7XG4gICAgICB2YXIgcmVtb3RlSWNlUGFyYW1ldGVycztcbiAgICAgIHZhciByZW1vdGVEdGxzUGFyYW1ldGVycztcbiAgICAgIGlmICghcmVqZWN0ZWQpIHtcbiAgICAgICAgcmVtb3RlSWNlUGFyYW1ldGVycyA9IFNEUFV0aWxzLmdldEljZVBhcmFtZXRlcnMobWVkaWFTZWN0aW9uLFxuICAgICAgICAgICAgc2Vzc2lvbnBhcnQpO1xuICAgICAgICByZW1vdGVEdGxzUGFyYW1ldGVycyA9IFNEUFV0aWxzLmdldER0bHNQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbixcbiAgICAgICAgICAgIHNlc3Npb25wYXJ0KTtcbiAgICAgICAgcmVtb3RlRHRsc1BhcmFtZXRlcnMucm9sZSA9ICdjbGllbnQnO1xuICAgICAgfVxuICAgICAgcmVjdkVuY29kaW5nUGFyYW1ldGVycyA9XG4gICAgICAgICAgU0RQVXRpbHMucGFyc2VSdHBFbmNvZGluZ1BhcmFtZXRlcnMobWVkaWFTZWN0aW9uKTtcblxuICAgICAgdmFyIHJ0Y3BQYXJhbWV0ZXJzID0gU0RQVXRpbHMucGFyc2VSdGNwUGFyYW1ldGVycyhtZWRpYVNlY3Rpb24pO1xuXG4gICAgICB2YXIgaXNDb21wbGV0ZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbixcbiAgICAgICAgICAnYT1lbmQtb2YtY2FuZGlkYXRlcycsIHNlc3Npb25wYXJ0KS5sZW5ndGggPiAwO1xuICAgICAgdmFyIGNhbmRzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1jYW5kaWRhdGU6JylcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uKGNhbmQpIHtcbiAgICAgICAgICAgIHJldHVybiBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShjYW5kKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oY2FuZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbmQuY29tcG9uZW50ID09PSAxO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAvLyBDaGVjayBpZiB3ZSBjYW4gdXNlIEJVTkRMRSBhbmQgZGlzcG9zZSB0cmFuc3BvcnRzLlxuICAgICAgaWYgKChkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInIHx8IGRlc2NyaXB0aW9uLnR5cGUgPT09ICdhbnN3ZXInKSAmJlxuICAgICAgICAgICFyZWplY3RlZCAmJiB1c2luZ0J1bmRsZSAmJiBzZHBNTGluZUluZGV4ID4gMCAmJlxuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSkge1xuICAgICAgICBwYy5fZGlzcG9zZUljZUFuZER0bHNUcmFuc3BvcnRzKHNkcE1MaW5lSW5kZXgpO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlR2F0aGVyZXIgPVxuICAgICAgICAgICAgcGMudHJhbnNjZWl2ZXJzWzBdLmljZUdhdGhlcmVyO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlVHJhbnNwb3J0ID1cbiAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5pY2VUcmFuc3BvcnQ7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5kdGxzVHJhbnNwb3J0ID1cbiAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0O1xuICAgICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0cFNlbmRlcikge1xuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5ydHBTZW5kZXIuc2V0VHJhbnNwb3J0KFxuICAgICAgICAgICAgICBwYy50cmFuc2NlaXZlcnNbMF0uZHRsc1RyYW5zcG9ydCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5ydHBSZWNlaXZlcikge1xuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5ydHBSZWNlaXZlci5zZXRUcmFuc3BvcnQoXG4gICAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicgJiYgIXJlamVjdGVkKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdIHx8XG4gICAgICAgICAgICBwYy5fY3JlYXRlVHJhbnNjZWl2ZXIoa2luZCk7XG4gICAgICAgIHRyYW5zY2VpdmVyLm1pZCA9IG1pZDtcblxuICAgICAgICBpZiAoIXRyYW5zY2VpdmVyLmljZUdhdGhlcmVyKSB7XG4gICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIgPSBwYy5fY3JlYXRlSWNlR2F0aGVyZXIoc2RwTUxpbmVJbmRleCxcbiAgICAgICAgICAgICAgdXNpbmdCdW5kbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbmRzLmxlbmd0aCAmJiB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgaWYgKGlzQ29tcGxldGUgJiYgKCF1c2luZ0J1bmRsZSB8fCBzZHBNTGluZUluZGV4ID09PSAwKSkge1xuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LnNldFJlbW90ZUNhbmRpZGF0ZXMoY2FuZHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYW5kcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICBtYXliZUFkZENhbmRpZGF0ZSh0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQsIGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbENhcGFiaWxpdGllcyA9IHdpbmRvdy5SVENSdHBSZWNlaXZlci5nZXRDYXBhYmlsaXRpZXMoa2luZCk7XG5cbiAgICAgICAgLy8gZmlsdGVyIFJUWCB1bnRpbCBhZGRpdGlvbmFsIHN0dWZmIG5lZWRlZCBmb3IgUlRYIGlzIGltcGxlbWVudGVkXG4gICAgICAgIC8vIGluIGFkYXB0ZXIuanNcbiAgICAgICAgaWYgKGVkZ2VWZXJzaW9uIDwgMTUwMTkpIHtcbiAgICAgICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MgPSBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZmlsdGVyKFxuICAgICAgICAgICAgICBmdW5jdGlvbihjb2RlYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb2RlYy5uYW1lICE9PSAncnR4JztcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzID0gdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycyB8fCBbe1xuICAgICAgICAgIHNzcmM6ICgyICogc2RwTUxpbmVJbmRleCArIDIpICogMTAwMVxuICAgICAgICB9XTtcblxuICAgICAgICAvLyBUT0RPOiByZXdyaXRlIHRvIHVzZSBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvI3NldC1hc3NvY2lhdGVkLXJlbW90ZS1zdHJlYW1zXG4gICAgICAgIHZhciBpc05ld1RyYWNrID0gZmFsc2U7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdzZW5kcmVjdicgfHwgZGlyZWN0aW9uID09PSAnc2VuZG9ubHknKSB7XG4gICAgICAgICAgaXNOZXdUcmFjayA9ICF0cmFuc2NlaXZlci5ydHBSZWNlaXZlcjtcbiAgICAgICAgICBydHBSZWNlaXZlciA9IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyIHx8XG4gICAgICAgICAgICAgIG5ldyB3aW5kb3cuUlRDUnRwUmVjZWl2ZXIodHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCwga2luZCk7XG5cbiAgICAgICAgICBpZiAoaXNOZXdUcmFjaykge1xuICAgICAgICAgICAgdmFyIHN0cmVhbTtcbiAgICAgICAgICAgIHRyYWNrID0gcnRwUmVjZWl2ZXIudHJhY2s7XG4gICAgICAgICAgICAvLyBGSVhNRTogZG9lcyBub3Qgd29yayB3aXRoIFBsYW4gQi5cbiAgICAgICAgICAgIGlmIChyZW1vdGVNc2lkICYmIHJlbW90ZU1zaWQuc3RyZWFtID09PSAnLScpIHtcbiAgICAgICAgICAgICAgLy8gbm8tb3AuIGEgc3RyZWFtIGlkIG9mICctJyBtZWFuczogbm8gYXNzb2NpYXRlZCBzdHJlYW0uXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlbW90ZU1zaWQpIHtcbiAgICAgICAgICAgICAgaWYgKCFzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSkge1xuICAgICAgICAgICAgICAgIHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbSgpO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSwgJ2lkJywge1xuICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlbW90ZU1zaWQuc3RyZWFtO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0cmFjaywgJ2lkJywge1xuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVtb3RlTXNpZC50cmFjaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBzdHJlYW0gPSBzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICghc3RyZWFtcy5kZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtcy5kZWZhdWx0ID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHN0cmVhbSA9IHN0cmVhbXMuZGVmYXVsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgYWRkVHJhY2tUb1N0cmVhbUFuZEZpcmVFdmVudCh0cmFjaywgc3RyZWFtKTtcbiAgICAgICAgICAgICAgdHJhbnNjZWl2ZXIuYXNzb2NpYXRlZFJlbW90ZU1lZGlhU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNlaXZlckxpc3QucHVzaChbdHJhY2ssIHJ0cFJlY2VpdmVyLCBzdHJlYW1dKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIgJiYgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIudHJhY2spIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci5hc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24ocykge1xuICAgICAgICAgICAgdmFyIG5hdGl2ZVRyYWNrID0gcy5nZXRUcmFja3MoKS5maW5kKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHQuaWQgPT09IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyLnRyYWNrLmlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobmF0aXZlVHJhY2spIHtcbiAgICAgICAgICAgICAgcmVtb3ZlVHJhY2tGcm9tU3RyZWFtQW5kRmlyZUV2ZW50KG5hdGl2ZVRyYWNrLCBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0cmFuc2NlaXZlci5hc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyA9IGxvY2FsQ2FwYWJpbGl0aWVzO1xuICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMgPSByZW1vdGVDYXBhYmlsaXRpZXM7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyID0gcnRwUmVjZWl2ZXI7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzID0gcnRjcFBhcmFtZXRlcnM7XG4gICAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgPSBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgICB0cmFuc2NlaXZlci5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzID0gcmVjdkVuY29kaW5nUGFyYW1ldGVycztcblxuICAgICAgICAvLyBTdGFydCB0aGUgUlRDUnRwUmVjZWl2ZXIgbm93LiBUaGUgUlRQU2VuZGVyIGlzIHN0YXJ0ZWQgaW5cbiAgICAgICAgLy8gc2V0TG9jYWxEZXNjcmlwdGlvbi5cbiAgICAgICAgcGMuX3RyYW5zY2VpdmUocGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICBpc05ld1RyYWNrKTtcbiAgICAgIH0gZWxzZSBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJ2Fuc3dlcicgJiYgIXJlamVjdGVkKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdO1xuICAgICAgICBpY2VHYXRoZXJlciA9IHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyO1xuICAgICAgICBpY2VUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQ7XG4gICAgICAgIGR0bHNUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0O1xuICAgICAgICBydHBSZWNlaXZlciA9IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzID0gdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgICAgbG9jYWxDYXBhYmlsaXRpZXMgPSB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcztcblxuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0ucmVjdkVuY29kaW5nUGFyYW1ldGVycyA9XG4gICAgICAgICAgICByZWN2RW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0ucmVtb3RlQ2FwYWJpbGl0aWVzID1cbiAgICAgICAgICAgIHJlbW90ZUNhcGFiaWxpdGllcztcbiAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0Y3BQYXJhbWV0ZXJzID0gcnRjcFBhcmFtZXRlcnM7XG5cbiAgICAgICAgaWYgKGNhbmRzLmxlbmd0aCAmJiBpY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgaWYgKChpc0ljZUxpdGUgfHwgaXNDb21wbGV0ZSkgJiZcbiAgICAgICAgICAgICAgKCF1c2luZ0J1bmRsZSB8fCBzZHBNTGluZUluZGV4ID09PSAwKSkge1xuICAgICAgICAgICAgaWNlVHJhbnNwb3J0LnNldFJlbW90ZUNhbmRpZGF0ZXMoY2FuZHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYW5kcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICBtYXliZUFkZENhbmRpZGF0ZSh0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQsIGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXVzaW5nQnVuZGxlIHx8IHNkcE1MaW5lSW5kZXggPT09IDApIHtcbiAgICAgICAgICBpZiAoaWNlVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgICAgaWNlVHJhbnNwb3J0LnN0YXJ0KGljZUdhdGhlcmVyLCByZW1vdGVJY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICdjb250cm9sbGluZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZHRsc1RyYW5zcG9ydC5zdGF0ZSA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgIGR0bHNUcmFuc3BvcnQuc3RhcnQocmVtb3RlRHRsc1BhcmFtZXRlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBjLl90cmFuc2NlaXZlKHRyYW5zY2VpdmVyLFxuICAgICAgICAgICAgZGlyZWN0aW9uID09PSAnc2VuZHJlY3YnIHx8IGRpcmVjdGlvbiA9PT0gJ3JlY3Zvbmx5JyxcbiAgICAgICAgICAgIGRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2JyB8fCBkaXJlY3Rpb24gPT09ICdzZW5kb25seScpO1xuXG4gICAgICAgIC8vIFRPRE86IHJld3JpdGUgdG8gdXNlIGh0dHA6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jc2V0LWFzc29jaWF0ZWQtcmVtb3RlLXN0cmVhbXNcbiAgICAgICAgaWYgKHJ0cFJlY2VpdmVyICYmXG4gICAgICAgICAgICAoZGlyZWN0aW9uID09PSAnc2VuZHJlY3YnIHx8IGRpcmVjdGlvbiA9PT0gJ3NlbmRvbmx5JykpIHtcbiAgICAgICAgICB0cmFjayA9IHJ0cFJlY2VpdmVyLnRyYWNrO1xuICAgICAgICAgIGlmIChyZW1vdGVNc2lkKSB7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dKSB7XG4gICAgICAgICAgICAgIHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkVHJhY2tUb1N0cmVhbUFuZEZpcmVFdmVudCh0cmFjaywgc3RyZWFtc1tyZW1vdGVNc2lkLnN0cmVhbV0pO1xuICAgICAgICAgICAgcmVjZWl2ZXJMaXN0LnB1c2goW3RyYWNrLCBydHBSZWNlaXZlciwgc3RyZWFtc1tyZW1vdGVNc2lkLnN0cmVhbV1dKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFzdHJlYW1zLmRlZmF1bHQpIHtcbiAgICAgICAgICAgICAgc3RyZWFtcy5kZWZhdWx0ID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkVHJhY2tUb1N0cmVhbUFuZEZpcmVFdmVudCh0cmFjaywgc3RyZWFtcy5kZWZhdWx0KTtcbiAgICAgICAgICAgIHJlY2VpdmVyTGlzdC5wdXNoKFt0cmFjaywgcnRwUmVjZWl2ZXIsIHN0cmVhbXMuZGVmYXVsdF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBGSVhNRTogYWN0dWFsbHkgdGhlIHJlY2VpdmVyIHNob3VsZCBiZSBjcmVhdGVkIGxhdGVyLlxuICAgICAgICAgIGRlbGV0ZSB0cmFuc2NlaXZlci5ydHBSZWNlaXZlcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHBjLl9kdGxzUm9sZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYy5fZHRsc1JvbGUgPSBkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInID8gJ2FjdGl2ZScgOiAncGFzc2l2ZSc7XG4gICAgfVxuXG4gICAgcGMucmVtb3RlRGVzY3JpcHRpb24gPSB7XG4gICAgICB0eXBlOiBkZXNjcmlwdGlvbi50eXBlLFxuICAgICAgc2RwOiBkZXNjcmlwdGlvbi5zZHBcbiAgICB9O1xuICAgIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInKSB7XG4gICAgICBwYy5fdXBkYXRlU2lnbmFsaW5nU3RhdGUoJ2hhdmUtcmVtb3RlLW9mZmVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBjLl91cGRhdGVTaWduYWxpbmdTdGF0ZSgnc3RhYmxlJyk7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKHN0cmVhbXMpLmZvckVhY2goZnVuY3Rpb24oc2lkKSB7XG4gICAgICB2YXIgc3RyZWFtID0gc3RyZWFtc1tzaWRdO1xuICAgICAgaWYgKHN0cmVhbS5nZXRUcmFja3MoKS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHBjLnJlbW90ZVN0cmVhbXMuaW5kZXhPZihzdHJlYW0pID09PSAtMSkge1xuICAgICAgICAgIHBjLnJlbW90ZVN0cmVhbXMucHVzaChzdHJlYW0pO1xuICAgICAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnYWRkc3RyZWFtJyk7XG4gICAgICAgICAgZXZlbnQuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGMuX2Rpc3BhdGNoRXZlbnQoJ2FkZHN0cmVhbScsIGV2ZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY2VpdmVyTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICB2YXIgdHJhY2sgPSBpdGVtWzBdO1xuICAgICAgICAgIHZhciByZWNlaXZlciA9IGl0ZW1bMV07XG4gICAgICAgICAgaWYgKHN0cmVhbS5pZCAhPT0gaXRlbVsyXS5pZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaXJlQWRkVHJhY2socGMsIHRyYWNrLCByZWNlaXZlciwgW3N0cmVhbV0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZWNlaXZlckxpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBmaXJlQWRkVHJhY2socGMsIGl0ZW1bMF0sIGl0ZW1bMV0sIFtdKTtcbiAgICB9KTtcblxuICAgIC8vIGNoZWNrIHdoZXRoZXIgYWRkSWNlQ2FuZGlkYXRlKHt9KSB3YXMgY2FsbGVkIHdpdGhpbiBmb3VyIHNlY29uZHMgYWZ0ZXJcbiAgICAvLyBzZXRSZW1vdGVEZXNjcmlwdGlvbi5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHBjICYmIHBjLnRyYW5zY2VpdmVycykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3JyAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LmdldFJlbW90ZUNhbmRpZGF0ZXMoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdUaW1lb3V0IGZvciBhZGRSZW1vdGVDYW5kaWRhdGUuIENvbnNpZGVyIHNlbmRpbmcgJyArXG4gICAgICAgICAgICAgICdhbiBlbmQtb2YtY2FuZGlkYXRlcyBub3RpZmljYXRpb24nKTtcbiAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuYWRkUmVtb3RlQ2FuZGlkYXRlKHt9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSwgNDAwMCk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgLyogbm90IHlldFxuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCkge1xuICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RvcCgpO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydC5zdG9wKCk7XG4gICAgICB9XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5zdG9wKCk7XG4gICAgICB9XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIuc3RvcCgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIEZJWE1FOiBjbGVhbiB1cCB0cmFja3MsIGxvY2FsIHN0cmVhbXMsIHJlbW90ZSBzdHJlYW1zLCBldGNcbiAgICB0aGlzLl9pc0Nsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlU2lnbmFsaW5nU3RhdGUoJ2Nsb3NlZCcpO1xuICB9O1xuXG4gIC8vIFVwZGF0ZSB0aGUgc2lnbmFsaW5nIHN0YXRlLlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVNpZ25hbGluZ1N0YXRlID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICB0aGlzLnNpZ25hbGluZ1N0YXRlID0gbmV3U3RhdGU7XG4gICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCdzaWduYWxpbmdzdGF0ZWNoYW5nZScpO1xuICAgIHRoaXMuX2Rpc3BhdGNoRXZlbnQoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgZXZlbnQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIHRvIGZpcmUgdGhlIG5lZ290aWF0aW9ubmVlZGVkIGV2ZW50LlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX21heWJlRmlyZU5lZ290aWF0aW9uTmVlZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICBpZiAodGhpcy5zaWduYWxpbmdTdGF0ZSAhPT0gJ3N0YWJsZScgfHwgdGhpcy5uZWVkTmVnb3RpYXRpb24gPT09IHRydWUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5uZWVkTmVnb3RpYXRpb24gPSB0cnVlO1xuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHBjLm5lZWROZWdvdGlhdGlvbikge1xuICAgICAgICBwYy5uZWVkTmVnb3RpYXRpb24gPSBmYWxzZTtcbiAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCduZWdvdGlhdGlvbm5lZWRlZCcpO1xuICAgICAgICBwYy5fZGlzcGF0Y2hFdmVudCgnbmVnb3RpYXRpb25uZWVkZWQnLCBldmVudCk7XG4gICAgICB9XG4gICAgfSwgMCk7XG4gIH07XG5cbiAgLy8gVXBkYXRlIHRoZSBpY2UgY29ubmVjdGlvbiBzdGF0ZS5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGVJY2VDb25uZWN0aW9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3U3RhdGU7XG4gICAgdmFyIHN0YXRlcyA9IHtcbiAgICAgICduZXcnOiAwLFxuICAgICAgY2xvc2VkOiAwLFxuICAgICAgY2hlY2tpbmc6IDAsXG4gICAgICBjb25uZWN0ZWQ6IDAsXG4gICAgICBjb21wbGV0ZWQ6IDAsXG4gICAgICBkaXNjb25uZWN0ZWQ6IDAsXG4gICAgICBmYWlsZWQ6IDBcbiAgICB9O1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHN0YXRlc1t0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGVdKys7XG4gICAgfSk7XG5cbiAgICBuZXdTdGF0ZSA9ICduZXcnO1xuICAgIGlmIChzdGF0ZXMuZmFpbGVkID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnZmFpbGVkJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jaGVja2luZyA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2NoZWNraW5nJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5kaXNjb25uZWN0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdkaXNjb25uZWN0ZWQnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLm5ldyA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ25ldyc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMuY29ubmVjdGVkID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnY29ubmVjdGVkJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jb21wbGV0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdjb21wbGV0ZWQnO1xuICAgIH1cblxuICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgIHRoaXMuaWNlQ29ubmVjdGlvblN0YXRlID0gbmV3U3RhdGU7XG4gICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScpO1xuICAgICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICAvLyBVcGRhdGUgdGhlIGNvbm5lY3Rpb24gc3RhdGUuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvblN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld1N0YXRlO1xuICAgIHZhciBzdGF0ZXMgPSB7XG4gICAgICAnbmV3JzogMCxcbiAgICAgIGNsb3NlZDogMCxcbiAgICAgIGNvbm5lY3Rpbmc6IDAsXG4gICAgICBjb25uZWN0ZWQ6IDAsXG4gICAgICBjb21wbGV0ZWQ6IDAsXG4gICAgICBkaXNjb25uZWN0ZWQ6IDAsXG4gICAgICBmYWlsZWQ6IDBcbiAgICB9O1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHN0YXRlc1t0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGVdKys7XG4gICAgICBzdGF0ZXNbdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydC5zdGF0ZV0rKztcbiAgICB9KTtcbiAgICAvLyBJQ0VUcmFuc3BvcnQuY29tcGxldGVkIGFuZCBjb25uZWN0ZWQgYXJlIHRoZSBzYW1lIGZvciB0aGlzIHB1cnBvc2UuXG4gICAgc3RhdGVzLmNvbm5lY3RlZCArPSBzdGF0ZXMuY29tcGxldGVkO1xuXG4gICAgbmV3U3RhdGUgPSAnbmV3JztcbiAgICBpZiAoc3RhdGVzLmZhaWxlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2ZhaWxlZCc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMuY29ubmVjdGluZyA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2Nvbm5lY3RpbmcnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLmRpc2Nvbm5lY3RlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2Rpc2Nvbm5lY3RlZCc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMubmV3ID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnbmV3JztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jb25uZWN0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdjb25uZWN0ZWQnO1xuICAgIH1cblxuICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5jb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvblN0YXRlID0gbmV3U3RhdGU7XG4gICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2Nvbm5lY3Rpb25zdGF0ZWNoYW5nZScpO1xuICAgICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuXG4gICAgaWYgKHBjLl9pc0Nsb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignSW52YWxpZFN0YXRlRXJyb3InLFxuICAgICAgICAgICdDYW4gbm90IGNhbGwgY3JlYXRlT2ZmZXIgYWZ0ZXIgY2xvc2UnKSk7XG4gICAgfVxuXG4gICAgdmFyIG51bUF1ZGlvVHJhY2tzID0gcGMudHJhbnNjZWl2ZXJzLmZpbHRlcihmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gdC5raW5kID09PSAnYXVkaW8nO1xuICAgIH0pLmxlbmd0aDtcbiAgICB2YXIgbnVtVmlkZW9UcmFja3MgPSBwYy50cmFuc2NlaXZlcnMuZmlsdGVyKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0LmtpbmQgPT09ICd2aWRlbyc7XG4gICAgfSkubGVuZ3RoO1xuXG4gICAgLy8gRGV0ZXJtaW5lIG51bWJlciBvZiBhdWRpbyBhbmQgdmlkZW8gdHJhY2tzIHdlIG5lZWQgdG8gc2VuZC9yZWN2LlxuICAgIHZhciBvZmZlck9wdGlvbnMgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKG9mZmVyT3B0aW9ucykge1xuICAgICAgLy8gUmVqZWN0IENocm9tZSBsZWdhY3kgY29uc3RyYWludHMuXG4gICAgICBpZiAob2ZmZXJPcHRpb25zLm1hbmRhdG9yeSB8fCBvZmZlck9wdGlvbnMub3B0aW9uYWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICdMZWdhY3kgbWFuZGF0b3J5L29wdGlvbmFsIGNvbnN0cmFpbnRzIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgICB9XG4gICAgICBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IHRydWUpIHtcbiAgICAgICAgICBudW1BdWRpb1RyYWNrcyA9IDE7XG4gICAgICAgIH0gZWxzZSBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IGZhbHNlKSB7XG4gICAgICAgICAgbnVtQXVkaW9UcmFja3MgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG51bUF1ZGlvVHJhY2tzID0gb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIG51bVZpZGVvVHJhY2tzID0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBudW1WaWRlb1RyYWNrcyA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtVmlkZW9UcmFja3MgPSBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHBjLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICBudW1BdWRpb1RyYWNrcy0tO1xuICAgICAgICBpZiAobnVtQXVkaW9UcmFja3MgPCAwKSB7XG4gICAgICAgICAgdHJhbnNjZWl2ZXIud2FudFJlY2VpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAndmlkZW8nKSB7XG4gICAgICAgIG51bVZpZGVvVHJhY2tzLS07XG4gICAgICAgIGlmIChudW1WaWRlb1RyYWNrcyA8IDApIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci53YW50UmVjZWl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgTS1saW5lcyBmb3IgcmVjdm9ubHkgc3RyZWFtcy5cbiAgICB3aGlsZSAobnVtQXVkaW9UcmFja3MgPiAwIHx8IG51bVZpZGVvVHJhY2tzID4gMCkge1xuICAgICAgaWYgKG51bUF1ZGlvVHJhY2tzID4gMCkge1xuICAgICAgICBwYy5fY3JlYXRlVHJhbnNjZWl2ZXIoJ2F1ZGlvJyk7XG4gICAgICAgIG51bUF1ZGlvVHJhY2tzLS07XG4gICAgICB9XG4gICAgICBpZiAobnVtVmlkZW9UcmFja3MgPiAwKSB7XG4gICAgICAgIHBjLl9jcmVhdGVUcmFuc2NlaXZlcigndmlkZW8nKTtcbiAgICAgICAgbnVtVmlkZW9UcmFja3MtLTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVTZXNzaW9uQm9pbGVycGxhdGUocGMuX3NkcFNlc3Npb25JZCxcbiAgICAgICAgcGMuX3NkcFNlc3Npb25WZXJzaW9uKyspO1xuICAgIHBjLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICAvLyBGb3IgZWFjaCB0cmFjaywgY3JlYXRlIGFuIGljZSBnYXRoZXJlciwgaWNlIHRyYW5zcG9ydCxcbiAgICAgIC8vIGR0bHMgdHJhbnNwb3J0LCBwb3RlbnRpYWxseSBydHBzZW5kZXIgYW5kIHJ0cHJlY2VpdmVyLlxuICAgICAgdmFyIHRyYWNrID0gdHJhbnNjZWl2ZXIudHJhY2s7XG4gICAgICB2YXIga2luZCA9IHRyYW5zY2VpdmVyLmtpbmQ7XG4gICAgICB2YXIgbWlkID0gdHJhbnNjZWl2ZXIubWlkIHx8IFNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllcigpO1xuICAgICAgdHJhbnNjZWl2ZXIubWlkID0gbWlkO1xuXG4gICAgICBpZiAoIXRyYW5zY2VpdmVyLmljZUdhdGhlcmVyKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyID0gcGMuX2NyZWF0ZUljZUdhdGhlcmVyKHNkcE1MaW5lSW5kZXgsXG4gICAgICAgICAgICBwYy51c2luZ0J1bmRsZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBsb2NhbENhcGFiaWxpdGllcyA9IHdpbmRvdy5SVENSdHBTZW5kZXIuZ2V0Q2FwYWJpbGl0aWVzKGtpbmQpO1xuICAgICAgLy8gZmlsdGVyIFJUWCB1bnRpbCBhZGRpdGlvbmFsIHN0dWZmIG5lZWRlZCBmb3IgUlRYIGlzIGltcGxlbWVudGVkXG4gICAgICAvLyBpbiBhZGFwdGVyLmpzXG4gICAgICBpZiAoZWRnZVZlcnNpb24gPCAxNTAxOSkge1xuICAgICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MgPSBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZmlsdGVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oY29kZWMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvZGVjLm5hbWUgIT09ICdydHgnO1xuICAgICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZm9yRWFjaChmdW5jdGlvbihjb2RlYykge1xuICAgICAgICAvLyB3b3JrIGFyb3VuZCBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9NjU1MlxuICAgICAgICAvLyBieSBhZGRpbmcgbGV2ZWwtYXN5bW1ldHJ5LWFsbG93ZWQ9MVxuICAgICAgICBpZiAoY29kZWMubmFtZSA9PT0gJ0gyNjQnICYmXG4gICAgICAgICAgICBjb2RlYy5wYXJhbWV0ZXJzWydsZXZlbC1hc3ltbWV0cnktYWxsb3dlZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb2RlYy5wYXJhbWV0ZXJzWydsZXZlbC1hc3ltbWV0cnktYWxsb3dlZCddID0gJzEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZm9yIHN1YnNlcXVlbnQgb2ZmZXJzLCB3ZSBtaWdodCBoYXZlIHRvIHJlLXVzZSB0aGUgcGF5bG9hZFxuICAgICAgICAvLyB0eXBlIG9mIHRoZSBsYXN0IG9mZmVyLlxuICAgICAgICBpZiAodHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzICYmXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMuY29kZWNzKSB7XG4gICAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzLmNvZGVjcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbW90ZUNvZGVjKSB7XG4gICAgICAgICAgICBpZiAoY29kZWMubmFtZS50b0xvd2VyQ2FzZSgpID09PSByZW1vdGVDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgJiZcbiAgICAgICAgICAgICAgICBjb2RlYy5jbG9ja1JhdGUgPT09IHJlbW90ZUNvZGVjLmNsb2NrUmF0ZSkge1xuICAgICAgICAgICAgICBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZSA9IHJlbW90ZUNvZGVjLnBheWxvYWRUeXBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMuZm9yRWFjaChmdW5jdGlvbihoZHJFeHQpIHtcbiAgICAgICAgdmFyIHJlbW90ZUV4dGVuc2lvbnMgPSB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMgJiZcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zIHx8IFtdO1xuICAgICAgICByZW1vdGVFeHRlbnNpb25zLmZvckVhY2goZnVuY3Rpb24ockhkckV4dCkge1xuICAgICAgICAgIGlmIChoZHJFeHQudXJpID09PSBySGRyRXh0LnVyaSkge1xuICAgICAgICAgICAgaGRyRXh0LmlkID0gckhkckV4dC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGdlbmVyYXRlIGFuIHNzcmMgbm93LCB0byBiZSB1c2VkIGxhdGVyIGluIHJ0cFNlbmRlci5zZW5kXG4gICAgICB2YXIgc2VuZEVuY29kaW5nUGFyYW1ldGVycyA9IHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgfHwgW3tcbiAgICAgICAgc3NyYzogKDIgKiBzZHBNTGluZUluZGV4ICsgMSkgKiAxMDAxXG4gICAgICB9XTtcbiAgICAgIGlmICh0cmFjaykge1xuICAgICAgICAvLyBhZGQgUlRYXG4gICAgICAgIGlmIChlZGdlVmVyc2lvbiA+PSAxNTAxOSAmJiBraW5kID09PSAndmlkZW8nICYmXG4gICAgICAgICAgICAhc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCA9IHtcbiAgICAgICAgICAgIHNzcmM6IHNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArIDFcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0cmFuc2NlaXZlci53YW50UmVjZWl2ZSkge1xuICAgICAgICB0cmFuc2NlaXZlci5ydHBSZWNlaXZlciA9IG5ldyB3aW5kb3cuUlRDUnRwUmVjZWl2ZXIoXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LCBraW5kKTtcbiAgICAgIH1cblxuICAgICAgdHJhbnNjZWl2ZXIubG9jYWxDYXBhYmlsaXRpZXMgPSBsb2NhbENhcGFiaWxpdGllcztcbiAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgPSBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgIH0pO1xuXG4gICAgLy8gYWx3YXlzIG9mZmVyIEJVTkRMRSBhbmQgZGlzcG9zZSBvbiByZXR1cm4gaWYgbm90IHN1cHBvcnRlZC5cbiAgICBpZiAocGMuX2NvbmZpZy5idW5kbGVQb2xpY3kgIT09ICdtYXgtY29tcGF0Jykge1xuICAgICAgc2RwICs9ICdhPWdyb3VwOkJVTkRMRSAnICsgcGMudHJhbnNjZWl2ZXJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0Lm1pZDtcbiAgICAgIH0pLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgIH1cbiAgICBzZHAgKz0gJ2E9aWNlLW9wdGlvbnM6dHJpY2tsZVxcclxcbic7XG5cbiAgICBwYy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlciwgc2RwTUxpbmVJbmRleCkge1xuICAgICAgc2RwICs9IHdyaXRlTWVkaWFTZWN0aW9uKHRyYW5zY2VpdmVyLCB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyxcbiAgICAgICAgICAnb2ZmZXInLCB0cmFuc2NlaXZlci5zdHJlYW0sIHBjLl9kdGxzUm9sZSk7XG4gICAgICBzZHAgKz0gJ2E9cnRjcC1yc2l6ZVxcclxcbic7XG5cbiAgICAgIGlmICh0cmFuc2NlaXZlci5pY2VHYXRoZXJlciAmJiBwYy5pY2VHYXRoZXJpbmdTdGF0ZSAhPT0gJ25ldycgJiZcbiAgICAgICAgICAoc2RwTUxpbmVJbmRleCA9PT0gMCB8fCAhcGMudXNpbmdCdW5kbGUpKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLmdldExvY2FsQ2FuZGlkYXRlcygpLmZvckVhY2goZnVuY3Rpb24oY2FuZCkge1xuICAgICAgICAgIGNhbmQuY29tcG9uZW50ID0gMTtcbiAgICAgICAgICBzZHAgKz0gJ2E9JyArIFNEUFV0aWxzLndyaXRlQ2FuZGlkYXRlKGNhbmQpICsgJ1xcclxcbic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0cmFuc2NlaXZlci5pY2VHYXRoZXJlci5zdGF0ZSA9PT0gJ2NvbXBsZXRlZCcpIHtcbiAgICAgICAgICBzZHAgKz0gJ2E9ZW5kLW9mLWNhbmRpZGF0ZXNcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgZGVzYyA9IG5ldyB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHtcbiAgICAgIHR5cGU6ICdvZmZlcicsXG4gICAgICBzZHA6IHNkcFxuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZGVzYyk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUFuc3dlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYyA9IHRoaXM7XG5cbiAgICBpZiAocGMuX2lzQ2xvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0NhbiBub3QgY2FsbCBjcmVhdGVBbnN3ZXIgYWZ0ZXIgY2xvc2UnKSk7XG4gICAgfVxuXG4gICAgaWYgKCEocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdoYXZlLXJlbW90ZS1vZmZlcicgfHxcbiAgICAgICAgcGMuc2lnbmFsaW5nU3RhdGUgPT09ICdoYXZlLWxvY2FsLXByYW5zd2VyJykpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQ2FuIG5vdCBjYWxsIGNyZWF0ZUFuc3dlciBpbiBzaWduYWxpbmdTdGF0ZSAnICsgcGMuc2lnbmFsaW5nU3RhdGUpKTtcbiAgICB9XG5cbiAgICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVTZXNzaW9uQm9pbGVycGxhdGUocGMuX3NkcFNlc3Npb25JZCxcbiAgICAgICAgcGMuX3NkcFNlc3Npb25WZXJzaW9uKyspO1xuICAgIGlmIChwYy51c2luZ0J1bmRsZSkge1xuICAgICAgc2RwICs9ICdhPWdyb3VwOkJVTkRMRSAnICsgcGMudHJhbnNjZWl2ZXJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0Lm1pZDtcbiAgICAgIH0pLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgIH1cbiAgICB2YXIgbWVkaWFTZWN0aW9uc0luT2ZmZXIgPSBTRFBVdGlscy5nZXRNZWRpYVNlY3Rpb25zKFxuICAgICAgICBwYy5yZW1vdGVEZXNjcmlwdGlvbi5zZHApLmxlbmd0aDtcbiAgICBwYy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlciwgc2RwTUxpbmVJbmRleCkge1xuICAgICAgaWYgKHNkcE1MaW5lSW5kZXggKyAxID4gbWVkaWFTZWN0aW9uc0luT2ZmZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLnJlamVjdGVkKSB7XG4gICAgICAgIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICAgICAgc2RwICs9ICdtPWFwcGxpY2F0aW9uIDAgRFRMUy9TQ1RQIDUwMDBcXHJcXG4nO1xuICAgICAgICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLmtpbmQgPT09ICdhdWRpbycpIHtcbiAgICAgICAgICBzZHAgKz0gJ209YXVkaW8gMCBVRFAvVExTL1JUUC9TQVZQRiAwXFxyXFxuJyArXG4gICAgICAgICAgICAgICdhPXJ0cG1hcDowIFBDTVUvODAwMFxcclxcbic7XG4gICAgICAgIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAgIHNkcCArPSAnbT12aWRlbyAwIFVEUC9UTFMvUlRQL1NBVlBGIDEyMFxcclxcbicgK1xuICAgICAgICAgICAgICAnYT1ydHBtYXA6MTIwIFZQOC85MDAwMFxcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgc2RwICs9ICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJyArXG4gICAgICAgICAgICAnYT1pbmFjdGl2ZVxcclxcbicgK1xuICAgICAgICAgICAgJ2E9bWlkOicgKyB0cmFuc2NlaXZlci5taWQgKyAnXFxyXFxuJztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBGSVhNRTogbG9vayBhdCBkaXJlY3Rpb24uXG4gICAgICBpZiAodHJhbnNjZWl2ZXIuc3RyZWFtKSB7XG4gICAgICAgIHZhciBsb2NhbFRyYWNrO1xuICAgICAgICBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgIGxvY2FsVHJhY2sgPSB0cmFuc2NlaXZlci5zdHJlYW0uZ2V0QXVkaW9UcmFja3MoKVswXTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgbG9jYWxUcmFjayA9IHRyYW5zY2VpdmVyLnN0cmVhbS5nZXRWaWRlb1RyYWNrcygpWzBdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb2NhbFRyYWNrKSB7XG4gICAgICAgICAgLy8gYWRkIFJUWFxuICAgICAgICAgIGlmIChlZGdlVmVyc2lvbiA+PSAxNTAxOSAmJiB0cmFuc2NlaXZlci5raW5kID09PSAndmlkZW8nICYmXG4gICAgICAgICAgICAgICF0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHggPSB7XG4gICAgICAgICAgICAgIHNzcmM6IHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArIDFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBpbnRlcnNlY3Rpb24gb2YgY2FwYWJpbGl0aWVzLlxuICAgICAgdmFyIGNvbW1vbkNhcGFiaWxpdGllcyA9IGdldENvbW1vbkNhcGFiaWxpdGllcyhcbiAgICAgICAgICB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyxcbiAgICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMpO1xuXG4gICAgICB2YXIgaGFzUnR4ID0gY29tbW9uQ2FwYWJpbGl0aWVzLmNvZGVjcy5maWx0ZXIoZnVuY3Rpb24oYykge1xuICAgICAgICByZXR1cm4gYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdydHgnO1xuICAgICAgfSkubGVuZ3RoO1xuICAgICAgaWYgKCFoYXNSdHggJiYgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgICAgZGVsZXRlIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4O1xuICAgICAgfVxuXG4gICAgICBzZHAgKz0gd3JpdGVNZWRpYVNlY3Rpb24odHJhbnNjZWl2ZXIsIGNvbW1vbkNhcGFiaWxpdGllcyxcbiAgICAgICAgICAnYW5zd2VyJywgdHJhbnNjZWl2ZXIuc3RyZWFtLCBwYy5fZHRsc1JvbGUpO1xuICAgICAgaWYgKHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzICYmXG4gICAgICAgICAgdHJhbnNjZWl2ZXIucnRjcFBhcmFtZXRlcnMucmVkdWNlZFNpemUpIHtcbiAgICAgICAgc2RwICs9ICdhPXJ0Y3AtcnNpemVcXHJcXG4nO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIGRlc2MgPSBuZXcgd2luZG93LlJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7XG4gICAgICB0eXBlOiAnYW5zd2VyJyxcbiAgICAgIHNkcDogc2RwXG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkZXNjKTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICB2YXIgc2VjdGlvbnM7XG4gICAgaWYgKGNhbmRpZGF0ZSAmJiAhKGNhbmRpZGF0ZS5zZHBNTGluZUluZGV4ICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgY2FuZGlkYXRlLnNkcE1pZCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdzZHBNTGluZUluZGV4IG9yIHNkcE1pZCByZXF1aXJlZCcpKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBuZWVkcyB0byBnbyBpbnRvIG9wcyBxdWV1ZS5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBpZiAoIXBjLnJlbW90ZURlc2NyaXB0aW9uKSB7XG4gICAgICAgIHJldHVybiByZWplY3QobWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgICAnQ2FuIG5vdCBhZGQgSUNFIGNhbmRpZGF0ZSB3aXRob3V0IGEgcmVtb3RlIGRlc2NyaXB0aW9uJykpO1xuICAgICAgfSBlbHNlIGlmICghY2FuZGlkYXRlIHx8IGNhbmRpZGF0ZS5jYW5kaWRhdGUgPT09ICcnKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcGMudHJhbnNjZWl2ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYgKHBjLnRyYW5zY2VpdmVyc1tqXS5yZWplY3RlZCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tqXS5pY2VUcmFuc3BvcnQuYWRkUmVtb3RlQ2FuZGlkYXRlKHt9KTtcbiAgICAgICAgICBzZWN0aW9ucyA9IFNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMocGMucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICBzZWN0aW9uc1tqXSArPSAnYT1lbmQtb2YtY2FuZGlkYXRlc1xcclxcbic7XG4gICAgICAgICAgcGMucmVtb3RlRGVzY3JpcHRpb24uc2RwID1cbiAgICAgICAgICAgICAgU0RQVXRpbHMuZ2V0RGVzY3JpcHRpb24ocGMucmVtb3RlRGVzY3JpcHRpb24uc2RwKSArXG4gICAgICAgICAgICAgIHNlY3Rpb25zLmpvaW4oJycpO1xuICAgICAgICAgIGlmIChwYy51c2luZ0J1bmRsZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2RwTUxpbmVJbmRleCA9IGNhbmRpZGF0ZS5zZHBNTGluZUluZGV4O1xuICAgICAgICBpZiAoY2FuZGlkYXRlLnNkcE1pZCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGMudHJhbnNjZWl2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW2ldLm1pZCA9PT0gY2FuZGlkYXRlLnNkcE1pZCkge1xuICAgICAgICAgICAgICBzZHBNTGluZUluZGV4ID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2NlaXZlciA9IHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XTtcbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyKSB7XG4gICAgICAgICAgaWYgKHRyYW5zY2VpdmVyLnJlamVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY2FuZCA9IE9iamVjdC5rZXlzKGNhbmRpZGF0ZS5jYW5kaWRhdGUpLmxlbmd0aCA+IDAgP1xuICAgICAgICAgICAgICBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShjYW5kaWRhdGUuY2FuZGlkYXRlKSA6IHt9O1xuICAgICAgICAgIC8vIElnbm9yZSBDaHJvbWUncyBpbnZhbGlkIGNhbmRpZGF0ZXMgc2luY2UgRWRnZSBkb2VzIG5vdCBsaWtlIHRoZW0uXG4gICAgICAgICAgaWYgKGNhbmQucHJvdG9jb2wgPT09ICd0Y3AnICYmIChjYW5kLnBvcnQgPT09IDAgfHwgY2FuZC5wb3J0ID09PSA5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWdub3JlIFJUQ1AgY2FuZGlkYXRlcywgd2UgYXNzdW1lIFJUQ1AtTVVYLlxuICAgICAgICAgIGlmIChjYW5kLmNvbXBvbmVudCAmJiBjYW5kLmNvbXBvbmVudCAhPT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gd2hlbiB1c2luZyBidW5kbGUsIGF2b2lkIGFkZGluZyBjYW5kaWRhdGVzIHRvIHRoZSB3cm9uZ1xuICAgICAgICAgIC8vIGljZSB0cmFuc3BvcnQuIEFuZCBhdm9pZCBhZGRpbmcgY2FuZGlkYXRlcyBhZGRlZCBpbiB0aGUgU0RQLlxuICAgICAgICAgIGlmIChzZHBNTGluZUluZGV4ID09PSAwIHx8IChzZHBNTGluZUluZGV4ID4gMCAmJlxuICAgICAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQgIT09IHBjLnRyYW5zY2VpdmVyc1swXS5pY2VUcmFuc3BvcnQpKSB7XG4gICAgICAgICAgICBpZiAoIW1heWJlQWRkQ2FuZGlkYXRlKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCwgY2FuZCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChtYWtlRXJyb3IoJ09wZXJhdGlvbkVycm9yJyxcbiAgICAgICAgICAgICAgICAgICdDYW4gbm90IGFkZCBJQ0UgY2FuZGlkYXRlJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgcmVtb3RlRGVzY3JpcHRpb24uXG4gICAgICAgICAgdmFyIGNhbmRpZGF0ZVN0cmluZyA9IGNhbmRpZGF0ZS5jYW5kaWRhdGUudHJpbSgpO1xuICAgICAgICAgIGlmIChjYW5kaWRhdGVTdHJpbmcuaW5kZXhPZignYT0nKSA9PT0gMCkge1xuICAgICAgICAgICAgY2FuZGlkYXRlU3RyaW5nID0gY2FuZGlkYXRlU3RyaW5nLnN1YnN0cigyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VjdGlvbnMgPSBTRFBVdGlscy5nZXRNZWRpYVNlY3Rpb25zKHBjLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgICAgc2VjdGlvbnNbc2RwTUxpbmVJbmRleF0gKz0gJ2E9JyArXG4gICAgICAgICAgICAgIChjYW5kLnR5cGUgPyBjYW5kaWRhdGVTdHJpbmcgOiAnZW5kLW9mLWNhbmRpZGF0ZXMnKVxuICAgICAgICAgICAgICArICdcXHJcXG4nO1xuICAgICAgICAgIHBjLnJlbW90ZURlc2NyaXB0aW9uLnNkcCA9XG4gICAgICAgICAgICAgIFNEUFV0aWxzLmdldERlc2NyaXB0aW9uKHBjLnJlbW90ZURlc2NyaXB0aW9uLnNkcCkgK1xuICAgICAgICAgICAgICBzZWN0aW9ucy5qb2luKCcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KG1ha2VFcnJvcignT3BlcmF0aW9uRXJyb3InLFxuICAgICAgICAgICAgICAnQ2FuIG5vdCBhZGQgSUNFIGNhbmRpZGF0ZScpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIFsncnRwU2VuZGVyJywgJ3J0cFJlY2VpdmVyJywgJ2ljZUdhdGhlcmVyJywgJ2ljZVRyYW5zcG9ydCcsXG4gICAgICAgICAgJ2R0bHNUcmFuc3BvcnQnXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgICAgICAgaWYgKHRyYW5zY2VpdmVyW21ldGhvZF0pIHtcbiAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0cmFuc2NlaXZlclttZXRob2RdLmdldFN0YXRzKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBmaXhTdGF0c1R5cGUgPSBmdW5jdGlvbihzdGF0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpbmJvdW5kcnRwOiAnaW5ib3VuZC1ydHAnLFxuICAgICAgICBvdXRib3VuZHJ0cDogJ291dGJvdW5kLXJ0cCcsXG4gICAgICAgIGNhbmRpZGF0ZXBhaXI6ICdjYW5kaWRhdGUtcGFpcicsXG4gICAgICAgIGxvY2FsY2FuZGlkYXRlOiAnbG9jYWwtY2FuZGlkYXRlJyxcbiAgICAgICAgcmVtb3RlY2FuZGlkYXRlOiAncmVtb3RlLWNhbmRpZGF0ZSdcbiAgICAgIH1bc3RhdC50eXBlXSB8fCBzdGF0LnR5cGU7XG4gICAgfTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgLy8gc2hpbSBnZXRTdGF0cyB3aXRoIG1hcGxpa2Ugc3VwcG9ydFxuICAgICAgdmFyIHJlc3VsdHMgPSBuZXcgTWFwKCk7XG4gICAgICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgcmVzLmZvckVhY2goZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0KS5mb3JFYWNoKGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXN1bHRbaWRdLnR5cGUgPSBmaXhTdGF0c1R5cGUocmVzdWx0W2lkXSk7XG4gICAgICAgICAgICByZXN1bHRzLnNldChpZCwgcmVzdWx0W2lkXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gbGVnYWN5IGNhbGxiYWNrIHNoaW1zLiBTaG91bGQgYmUgbW92ZWQgdG8gYWRhcHRlci5qcyBzb21lIGRheXMuXG4gIHZhciBtZXRob2RzID0gWydjcmVhdGVPZmZlcicsICdjcmVhdGVBbnN3ZXInXTtcbiAgbWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIHZhciBuYXRpdmVNZXRob2QgPSBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgICB0eXBlb2YgYXJnc1sxXSA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBsZWdhY3lcbiAgICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBbYXJndW1lbnRzWzJdXSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFyZ3NbMF0uYXBwbHkobnVsbCwgW2Rlc2NyaXB0aW9uXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXJnc1sxXS5hcHBseShudWxsLCBbZXJyb3JdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0pO1xuXG4gIG1ldGhvZHMgPSBbJ3NldExvY2FsRGVzY3JpcHRpb24nLCAnc2V0UmVtb3RlRGVzY3JpcHRpb24nLCAnYWRkSWNlQ2FuZGlkYXRlJ107XG4gIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICB2YXIgbmF0aXZlTWV0aG9kID0gUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF07XG4gICAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgICAgdHlwZW9mIGFyZ3NbMl0gPT09ICdmdW5jdGlvbicpIHsgLy8gbGVnYWN5XG4gICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFyZ3NbMV0uYXBwbHkobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXJnc1syXS5hcHBseShudWxsLCBbZXJyb3JdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIGdldFN0YXRzIGlzIHNwZWNpYWwuIEl0IGRvZXNuJ3QgaGF2ZSBhIHNwZWMgbGVnYWN5IG1ldGhvZCB5ZXQgd2Ugc3VwcG9ydFxuICAvLyBnZXRTdGF0cyhzb21ldGhpbmcsIGNiKSB3aXRob3V0IGVycm9yIGNhbGxiYWNrcy5cbiAgWydnZXRTdGF0cyddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgdmFyIG5hdGl2ZU1ldGhvZCA9IFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdO1xuICAgIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhcmdzWzFdLmFwcGx5KG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIFJUQ1BlZXJDb25uZWN0aW9uO1xufTtcblxufSx7XCJzZHBcIjoyfV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4gLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbi8vIFNEUCBoZWxwZXJzLlxudmFyIFNEUFV0aWxzID0ge307XG5cbi8vIEdlbmVyYXRlIGFuIGFscGhhbnVtZXJpYyBpZGVudGlmaWVyIGZvciBjbmFtZSBvciBtaWRzLlxuLy8gVE9ETzogdXNlIFVVSURzIGluc3RlYWQ/IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2plZC85ODI4ODNcblNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEwKTtcbn07XG5cbi8vIFRoZSBSVENQIENOQU1FIHVzZWQgYnkgYWxsIHBlZXJjb25uZWN0aW9ucyBmcm9tIHRoZSBzYW1lIEpTLlxuU0RQVXRpbHMubG9jYWxDTmFtZSA9IFNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllcigpO1xuXG4vLyBTcGxpdHMgU0RQIGludG8gbGluZXMsIGRlYWxpbmcgd2l0aCBib3RoIENSTEYgYW5kIExGLlxuU0RQVXRpbHMuc3BsaXRMaW5lcyA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgcmV0dXJuIGJsb2IudHJpbSgpLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgIHJldHVybiBsaW5lLnRyaW0oKTtcbiAgfSk7XG59O1xuLy8gU3BsaXRzIFNEUCBpbnRvIHNlc3Npb25wYXJ0IGFuZCBtZWRpYXNlY3Rpb25zLiBFbnN1cmVzIENSTEYuXG5TRFBVdGlscy5zcGxpdFNlY3Rpb25zID0gZnVuY3Rpb24oYmxvYikge1xuICB2YXIgcGFydHMgPSBibG9iLnNwbGl0KCdcXG5tPScpO1xuICByZXR1cm4gcGFydHMubWFwKGZ1bmN0aW9uKHBhcnQsIGluZGV4KSB7XG4gICAgcmV0dXJuIChpbmRleCA+IDAgPyAnbT0nICsgcGFydCA6IHBhcnQpLnRyaW0oKSArICdcXHJcXG4nO1xuICB9KTtcbn07XG5cbi8vIHJldHVybnMgdGhlIHNlc3Npb24gZGVzY3JpcHRpb24uXG5TRFBVdGlscy5nZXREZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgdmFyIHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhibG9iKTtcbiAgcmV0dXJuIHNlY3Rpb25zICYmIHNlY3Rpb25zWzBdO1xufTtcblxuLy8gcmV0dXJucyB0aGUgaW5kaXZpZHVhbCBtZWRpYSBzZWN0aW9ucy5cblNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMgPSBmdW5jdGlvbihibG9iKSB7XG4gIHZhciBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMoYmxvYik7XG4gIHNlY3Rpb25zLnNoaWZ0KCk7XG4gIHJldHVybiBzZWN0aW9ucztcbn07XG5cbi8vIFJldHVybnMgbGluZXMgdGhhdCBzdGFydCB3aXRoIGEgY2VydGFpbiBwcmVmaXguXG5TRFBVdGlscy5tYXRjaFByZWZpeCA9IGZ1bmN0aW9uKGJsb2IsIHByZWZpeCkge1xuICByZXR1cm4gU0RQVXRpbHMuc3BsaXRMaW5lcyhibG9iKS5maWx0ZXIoZnVuY3Rpb24obGluZSkge1xuICAgIHJldHVybiBsaW5lLmluZGV4T2YocHJlZml4KSA9PT0gMDtcbiAgfSk7XG59O1xuXG4vLyBQYXJzZXMgYW4gSUNFIGNhbmRpZGF0ZSBsaW5lLiBTYW1wbGUgaW5wdXQ6XG4vLyBjYW5kaWRhdGU6NzAyNzg2MzUwIDIgdWRwIDQxODE5OTAyIDguOC44LjggNjA3NjkgdHlwIHJlbGF5IHJhZGRyIDguOC44Ljhcbi8vIHJwb3J0IDU1OTk2XCJcblNEUFV0aWxzLnBhcnNlQ2FuZGlkYXRlID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHM7XG4gIC8vIFBhcnNlIGJvdGggdmFyaWFudHMuXG4gIGlmIChsaW5lLmluZGV4T2YoJ2E9Y2FuZGlkYXRlOicpID09PSAwKSB7XG4gICAgcGFydHMgPSBsaW5lLnN1YnN0cmluZygxMikuc3BsaXQoJyAnKTtcbiAgfSBlbHNlIHtcbiAgICBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDEwKS5zcGxpdCgnICcpO1xuICB9XG5cbiAgdmFyIGNhbmRpZGF0ZSA9IHtcbiAgICBmb3VuZGF0aW9uOiBwYXJ0c1swXSxcbiAgICBjb21wb25lbnQ6IHBhcnNlSW50KHBhcnRzWzFdLCAxMCksXG4gICAgcHJvdG9jb2w6IHBhcnRzWzJdLnRvTG93ZXJDYXNlKCksXG4gICAgcHJpb3JpdHk6IHBhcnNlSW50KHBhcnRzWzNdLCAxMCksXG4gICAgaXA6IHBhcnRzWzRdLFxuICAgIHBvcnQ6IHBhcnNlSW50KHBhcnRzWzVdLCAxMCksXG4gICAgLy8gc2tpcCBwYXJ0c1s2XSA9PSAndHlwJ1xuICAgIHR5cGU6IHBhcnRzWzddXG4gIH07XG5cbiAgZm9yICh2YXIgaSA9IDg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHN3aXRjaCAocGFydHNbaV0pIHtcbiAgICAgIGNhc2UgJ3JhZGRyJzpcbiAgICAgICAgY2FuZGlkYXRlLnJlbGF0ZWRBZGRyZXNzID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3Jwb3J0JzpcbiAgICAgICAgY2FuZGlkYXRlLnJlbGF0ZWRQb3J0ID0gcGFyc2VJbnQocGFydHNbaSArIDFdLCAxMCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndGNwdHlwZSc6XG4gICAgICAgIGNhbmRpZGF0ZS50Y3BUeXBlID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3VmcmFnJzpcbiAgICAgICAgY2FuZGlkYXRlLnVmcmFnID0gcGFydHNbaSArIDFdOyAvLyBmb3IgYmFja3dhcmQgY29tcGFiaWxpdHkuXG4gICAgICAgIGNhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50ID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6IC8vIGV4dGVuc2lvbiBoYW5kbGluZywgaW4gcGFydGljdWxhciB1ZnJhZ1xuICAgICAgICBjYW5kaWRhdGVbcGFydHNbaV1dID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNhbmRpZGF0ZTtcbn07XG5cbi8vIFRyYW5zbGF0ZXMgYSBjYW5kaWRhdGUgb2JqZWN0IGludG8gU0RQIGNhbmRpZGF0ZSBhdHRyaWJ1dGUuXG5TRFBVdGlscy53cml0ZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICB2YXIgc2RwID0gW107XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5mb3VuZGF0aW9uKTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLmNvbXBvbmVudCk7XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpKTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLnByaW9yaXR5KTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLmlwKTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLnBvcnQpO1xuXG4gIHZhciB0eXBlID0gY2FuZGlkYXRlLnR5cGU7XG4gIHNkcC5wdXNoKCd0eXAnKTtcbiAgc2RwLnB1c2godHlwZSk7XG4gIGlmICh0eXBlICE9PSAnaG9zdCcgJiYgY2FuZGlkYXRlLnJlbGF0ZWRBZGRyZXNzICYmXG4gICAgICBjYW5kaWRhdGUucmVsYXRlZFBvcnQpIHtcbiAgICBzZHAucHVzaCgncmFkZHInKTtcbiAgICBzZHAucHVzaChjYW5kaWRhdGUucmVsYXRlZEFkZHJlc3MpOyAvLyB3YXM6IHJlbEFkZHJcbiAgICBzZHAucHVzaCgncnBvcnQnKTtcbiAgICBzZHAucHVzaChjYW5kaWRhdGUucmVsYXRlZFBvcnQpOyAvLyB3YXM6IHJlbFBvcnRcbiAgfVxuICBpZiAoY2FuZGlkYXRlLnRjcFR5cGUgJiYgY2FuZGlkYXRlLnByb3RvY29sLnRvTG93ZXJDYXNlKCkgPT09ICd0Y3AnKSB7XG4gICAgc2RwLnB1c2goJ3RjcHR5cGUnKTtcbiAgICBzZHAucHVzaChjYW5kaWRhdGUudGNwVHlwZSk7XG4gIH1cbiAgaWYgKGNhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50IHx8IGNhbmRpZGF0ZS51ZnJhZykge1xuICAgIHNkcC5wdXNoKCd1ZnJhZycpO1xuICAgIHNkcC5wdXNoKGNhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50IHx8IGNhbmRpZGF0ZS51ZnJhZyk7XG4gIH1cbiAgcmV0dXJuICdjYW5kaWRhdGU6JyArIHNkcC5qb2luKCcgJyk7XG59O1xuXG4vLyBQYXJzZXMgYW4gaWNlLW9wdGlvbnMgbGluZSwgcmV0dXJucyBhbiBhcnJheSBvZiBvcHRpb24gdGFncy5cbi8vIGE9aWNlLW9wdGlvbnM6Zm9vIGJhclxuU0RQVXRpbHMucGFyc2VJY2VPcHRpb25zID0gZnVuY3Rpb24obGluZSkge1xuICByZXR1cm4gbGluZS5zdWJzdHIoMTQpLnNwbGl0KCcgJyk7XG59XG5cbi8vIFBhcnNlcyBhbiBydHBtYXAgbGluZSwgcmV0dXJucyBSVENSdHBDb2RkZWNQYXJhbWV0ZXJzLiBTYW1wbGUgaW5wdXQ6XG4vLyBhPXJ0cG1hcDoxMTEgb3B1cy80ODAwMC8yXG5TRFBVdGlscy5wYXJzZVJ0cE1hcCA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoOSkuc3BsaXQoJyAnKTtcbiAgdmFyIHBhcnNlZCA9IHtcbiAgICBwYXlsb2FkVHlwZTogcGFyc2VJbnQocGFydHMuc2hpZnQoKSwgMTApIC8vIHdhczogaWRcbiAgfTtcblxuICBwYXJ0cyA9IHBhcnRzWzBdLnNwbGl0KCcvJyk7XG5cbiAgcGFyc2VkLm5hbWUgPSBwYXJ0c1swXTtcbiAgcGFyc2VkLmNsb2NrUmF0ZSA9IHBhcnNlSW50KHBhcnRzWzFdLCAxMCk7IC8vIHdhczogY2xvY2tyYXRlXG4gIC8vIHdhczogY2hhbm5lbHNcbiAgcGFyc2VkLm51bUNoYW5uZWxzID0gcGFydHMubGVuZ3RoID09PSAzID8gcGFyc2VJbnQocGFydHNbMl0sIDEwKSA6IDE7XG4gIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vLyBHZW5lcmF0ZSBhbiBhPXJ0cG1hcCBsaW5lIGZyb20gUlRDUnRwQ29kZWNDYXBhYmlsaXR5IG9yXG4vLyBSVENSdHBDb2RlY1BhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZVJ0cE1hcCA9IGZ1bmN0aW9uKGNvZGVjKSB7XG4gIHZhciBwdCA9IGNvZGVjLnBheWxvYWRUeXBlO1xuICBpZiAoY29kZWMucHJlZmVycmVkUGF5bG9hZFR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgIHB0ID0gY29kZWMucHJlZmVycmVkUGF5bG9hZFR5cGU7XG4gIH1cbiAgcmV0dXJuICdhPXJ0cG1hcDonICsgcHQgKyAnICcgKyBjb2RlYy5uYW1lICsgJy8nICsgY29kZWMuY2xvY2tSYXRlICtcbiAgICAgIChjb2RlYy5udW1DaGFubmVscyAhPT0gMSA/ICcvJyArIGNvZGVjLm51bUNoYW5uZWxzIDogJycpICsgJ1xcclxcbic7XG59O1xuXG4vLyBQYXJzZXMgYW4gYT1leHRtYXAgbGluZSAoaGVhZGVyZXh0ZW5zaW9uIGZyb20gUkZDIDUyODUpLiBTYW1wbGUgaW5wdXQ6XG4vLyBhPWV4dG1hcDoyIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcbi8vIGE9ZXh0bWFwOjIvc2VuZG9ubHkgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6dG9mZnNldFxuU0RQVXRpbHMucGFyc2VFeHRtYXAgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDkpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IHBhcnNlSW50KHBhcnRzWzBdLCAxMCksXG4gICAgZGlyZWN0aW9uOiBwYXJ0c1swXS5pbmRleE9mKCcvJykgPiAwID8gcGFydHNbMF0uc3BsaXQoJy8nKVsxXSA6ICdzZW5kcmVjdicsXG4gICAgdXJpOiBwYXJ0c1sxXVxuICB9O1xufTtcblxuLy8gR2VuZXJhdGVzIGE9ZXh0bWFwIGxpbmUgZnJvbSBSVENSdHBIZWFkZXJFeHRlbnNpb25QYXJhbWV0ZXJzIG9yXG4vLyBSVENSdHBIZWFkZXJFeHRlbnNpb24uXG5TRFBVdGlscy53cml0ZUV4dG1hcCA9IGZ1bmN0aW9uKGhlYWRlckV4dGVuc2lvbikge1xuICByZXR1cm4gJ2E9ZXh0bWFwOicgKyAoaGVhZGVyRXh0ZW5zaW9uLmlkIHx8IGhlYWRlckV4dGVuc2lvbi5wcmVmZXJyZWRJZCkgK1xuICAgICAgKGhlYWRlckV4dGVuc2lvbi5kaXJlY3Rpb24gJiYgaGVhZGVyRXh0ZW5zaW9uLmRpcmVjdGlvbiAhPT0gJ3NlbmRyZWN2J1xuICAgICAgICAgID8gJy8nICsgaGVhZGVyRXh0ZW5zaW9uLmRpcmVjdGlvblxuICAgICAgICAgIDogJycpICtcbiAgICAgICcgJyArIGhlYWRlckV4dGVuc2lvbi51cmkgKyAnXFxyXFxuJztcbn07XG5cbi8vIFBhcnNlcyBhbiBmdG1wIGxpbmUsIHJldHVybnMgZGljdGlvbmFyeS4gU2FtcGxlIGlucHV0OlxuLy8gYT1mbXRwOjk2IHZicj1vbjtjbmc9b25cbi8vIEFsc28gZGVhbHMgd2l0aCB2YnI9b247IGNuZz1vblxuU0RQVXRpbHMucGFyc2VGbXRwID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFyc2VkID0ge307XG4gIHZhciBrdjtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIobGluZS5pbmRleE9mKCcgJykgKyAxKS5zcGxpdCgnOycpO1xuICBmb3IgKHZhciBqID0gMDsgaiA8IHBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAga3YgPSBwYXJ0c1tqXS50cmltKCkuc3BsaXQoJz0nKTtcbiAgICBwYXJzZWRba3ZbMF0udHJpbSgpXSA9IGt2WzFdO1xuICB9XG4gIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vLyBHZW5lcmF0ZXMgYW4gYT1mdG1wIGxpbmUgZnJvbSBSVENSdHBDb2RlY0NhcGFiaWxpdHkgb3IgUlRDUnRwQ29kZWNQYXJhbWV0ZXJzLlxuU0RQVXRpbHMud3JpdGVGbXRwID0gZnVuY3Rpb24oY29kZWMpIHtcbiAgdmFyIGxpbmUgPSAnJztcbiAgdmFyIHB0ID0gY29kZWMucGF5bG9hZFR5cGU7XG4gIGlmIChjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcHQgPSBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZTtcbiAgfVxuICBpZiAoY29kZWMucGFyYW1ldGVycyAmJiBPYmplY3Qua2V5cyhjb2RlYy5wYXJhbWV0ZXJzKS5sZW5ndGgpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgT2JqZWN0LmtleXMoY29kZWMucGFyYW1ldGVycykuZm9yRWFjaChmdW5jdGlvbihwYXJhbSkge1xuICAgICAgcGFyYW1zLnB1c2gocGFyYW0gKyAnPScgKyBjb2RlYy5wYXJhbWV0ZXJzW3BhcmFtXSk7XG4gICAgfSk7XG4gICAgbGluZSArPSAnYT1mbXRwOicgKyBwdCArICcgJyArIHBhcmFtcy5qb2luKCc7JykgKyAnXFxyXFxuJztcbiAgfVxuICByZXR1cm4gbGluZTtcbn07XG5cbi8vIFBhcnNlcyBhbiBydGNwLWZiIGxpbmUsIHJldHVybnMgUlRDUFJ0Y3BGZWVkYmFjayBvYmplY3QuIFNhbXBsZSBpbnB1dDpcbi8vIGE9cnRjcC1mYjo5OCBuYWNrIHJwc2lcblNEUFV0aWxzLnBhcnNlUnRjcEZiID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cihsaW5lLmluZGV4T2YoJyAnKSArIDEpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAgdHlwZTogcGFydHMuc2hpZnQoKSxcbiAgICBwYXJhbWV0ZXI6IHBhcnRzLmpvaW4oJyAnKVxuICB9O1xufTtcbi8vIEdlbmVyYXRlIGE9cnRjcC1mYiBsaW5lcyBmcm9tIFJUQ1J0cENvZGVjQ2FwYWJpbGl0eSBvciBSVENSdHBDb2RlY1BhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZVJ0Y3BGYiA9IGZ1bmN0aW9uKGNvZGVjKSB7XG4gIHZhciBsaW5lcyA9ICcnO1xuICB2YXIgcHQgPSBjb2RlYy5wYXlsb2FkVHlwZTtcbiAgaWYgKGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICBwdCA9IGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlO1xuICB9XG4gIGlmIChjb2RlYy5ydGNwRmVlZGJhY2sgJiYgY29kZWMucnRjcEZlZWRiYWNrLmxlbmd0aCkge1xuICAgIC8vIEZJWE1FOiBzcGVjaWFsIGhhbmRsaW5nIGZvciB0cnItaW50P1xuICAgIGNvZGVjLnJ0Y3BGZWVkYmFjay5mb3JFYWNoKGZ1bmN0aW9uKGZiKSB7XG4gICAgICBsaW5lcyArPSAnYT1ydGNwLWZiOicgKyBwdCArICcgJyArIGZiLnR5cGUgK1xuICAgICAgKGZiLnBhcmFtZXRlciAmJiBmYi5wYXJhbWV0ZXIubGVuZ3RoID8gJyAnICsgZmIucGFyYW1ldGVyIDogJycpICtcbiAgICAgICAgICAnXFxyXFxuJztcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbGluZXM7XG59O1xuXG4vLyBQYXJzZXMgYW4gUkZDIDU1NzYgc3NyYyBtZWRpYSBhdHRyaWJ1dGUuIFNhbXBsZSBpbnB1dDpcbi8vIGE9c3NyYzozNzM1OTI4NTU5IGNuYW1lOnNvbWV0aGluZ1xuU0RQVXRpbHMucGFyc2VTc3JjTWVkaWEgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBzcCA9IGxpbmUuaW5kZXhPZignICcpO1xuICB2YXIgcGFydHMgPSB7XG4gICAgc3NyYzogcGFyc2VJbnQobGluZS5zdWJzdHIoNywgc3AgLSA3KSwgMTApXG4gIH07XG4gIHZhciBjb2xvbiA9IGxpbmUuaW5kZXhPZignOicsIHNwKTtcbiAgaWYgKGNvbG9uID4gLTEpIHtcbiAgICBwYXJ0cy5hdHRyaWJ1dGUgPSBsaW5lLnN1YnN0cihzcCArIDEsIGNvbG9uIC0gc3AgLSAxKTtcbiAgICBwYXJ0cy52YWx1ZSA9IGxpbmUuc3Vic3RyKGNvbG9uICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgcGFydHMuYXR0cmlidXRlID0gbGluZS5zdWJzdHIoc3AgKyAxKTtcbiAgfVxuICByZXR1cm4gcGFydHM7XG59O1xuXG4vLyBFeHRyYWN0cyB0aGUgTUlEIChSRkMgNTg4OCkgZnJvbSBhIG1lZGlhIHNlY3Rpb24uXG4vLyByZXR1cm5zIHRoZSBNSUQgb3IgdW5kZWZpbmVkIGlmIG5vIG1pZCBsaW5lIHdhcyBmb3VuZC5cblNEUFV0aWxzLmdldE1pZCA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgbWlkID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1taWQ6JylbMF07XG4gIGlmIChtaWQpIHtcbiAgICByZXR1cm4gbWlkLnN1YnN0cig2KTtcbiAgfVxufVxuXG5TRFBVdGlscy5wYXJzZUZpbmdlcnByaW50ID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cigxNCkuc3BsaXQoJyAnKTtcbiAgcmV0dXJuIHtcbiAgICBhbGdvcml0aG06IHBhcnRzWzBdLnRvTG93ZXJDYXNlKCksIC8vIGFsZ29yaXRobSBpcyBjYXNlLXNlbnNpdGl2ZSBpbiBFZGdlLlxuICAgIHZhbHVlOiBwYXJ0c1sxXVxuICB9O1xufTtcblxuLy8gRXh0cmFjdHMgRFRMUyBwYXJhbWV0ZXJzIGZyb20gU0RQIG1lZGlhIHNlY3Rpb24gb3Igc2Vzc2lvbnBhcnQuXG4vLyBGSVhNRTogZm9yIGNvbnNpc3RlbmN5IHdpdGggb3RoZXIgZnVuY3Rpb25zIHRoaXMgc2hvdWxkIG9ubHlcbi8vICAgZ2V0IHRoZSBmaW5nZXJwcmludCBsaW5lIGFzIGlucHV0LiBTZWUgYWxzbyBnZXRJY2VQYXJhbWV0ZXJzLlxuU0RQVXRpbHMuZ2V0RHRsc1BhcmFtZXRlcnMgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KSB7XG4gIHZhciBsaW5lcyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiArIHNlc3Npb25wYXJ0LFxuICAgICAgJ2E9ZmluZ2VycHJpbnQ6Jyk7XG4gIC8vIE5vdGU6IGE9c2V0dXAgbGluZSBpcyBpZ25vcmVkIHNpbmNlIHdlIHVzZSB0aGUgJ2F1dG8nIHJvbGUuXG4gIC8vIE5vdGUyOiAnYWxnb3JpdGhtJyBpcyBub3QgY2FzZSBzZW5zaXRpdmUgZXhjZXB0IGluIEVkZ2UuXG4gIHJldHVybiB7XG4gICAgcm9sZTogJ2F1dG8nLFxuICAgIGZpbmdlcnByaW50czogbGluZXMubWFwKFNEUFV0aWxzLnBhcnNlRmluZ2VycHJpbnQpXG4gIH07XG59O1xuXG4vLyBTZXJpYWxpemVzIERUTFMgcGFyYW1ldGVycyB0byBTRFAuXG5TRFBVdGlscy53cml0ZUR0bHNQYXJhbWV0ZXJzID0gZnVuY3Rpb24ocGFyYW1zLCBzZXR1cFR5cGUpIHtcbiAgdmFyIHNkcCA9ICdhPXNldHVwOicgKyBzZXR1cFR5cGUgKyAnXFxyXFxuJztcbiAgcGFyYW1zLmZpbmdlcnByaW50cy5mb3JFYWNoKGZ1bmN0aW9uKGZwKSB7XG4gICAgc2RwICs9ICdhPWZpbmdlcnByaW50OicgKyBmcC5hbGdvcml0aG0gKyAnICcgKyBmcC52YWx1ZSArICdcXHJcXG4nO1xuICB9KTtcbiAgcmV0dXJuIHNkcDtcbn07XG4vLyBQYXJzZXMgSUNFIGluZm9ybWF0aW9uIGZyb20gU0RQIG1lZGlhIHNlY3Rpb24gb3Igc2Vzc2lvbnBhcnQuXG4vLyBGSVhNRTogZm9yIGNvbnNpc3RlbmN5IHdpdGggb3RoZXIgZnVuY3Rpb25zIHRoaXMgc2hvdWxkIG9ubHlcbi8vICAgZ2V0IHRoZSBpY2UtdWZyYWcgYW5kIGljZS1wd2QgbGluZXMgYXMgaW5wdXQuXG5TRFBVdGlscy5nZXRJY2VQYXJhbWV0ZXJzID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCkge1xuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIC8vIFNlYXJjaCBpbiBzZXNzaW9uIHBhcnQsIHRvby5cbiAgbGluZXMgPSBsaW5lcy5jb25jYXQoU0RQVXRpbHMuc3BsaXRMaW5lcyhzZXNzaW9ucGFydCkpO1xuICB2YXIgaWNlUGFyYW1ldGVycyA9IHtcbiAgICB1c2VybmFtZUZyYWdtZW50OiBsaW5lcy5maWx0ZXIoZnVuY3Rpb24obGluZSkge1xuICAgICAgcmV0dXJuIGxpbmUuaW5kZXhPZignYT1pY2UtdWZyYWc6JykgPT09IDA7XG4gICAgfSlbMF0uc3Vic3RyKDEyKSxcbiAgICBwYXNzd29yZDogbGluZXMuZmlsdGVyKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHJldHVybiBsaW5lLmluZGV4T2YoJ2E9aWNlLXB3ZDonKSA9PT0gMDtcbiAgICB9KVswXS5zdWJzdHIoMTApXG4gIH07XG4gIHJldHVybiBpY2VQYXJhbWV0ZXJzO1xufTtcblxuLy8gU2VyaWFsaXplcyBJQ0UgcGFyYW1ldGVycyB0byBTRFAuXG5TRFBVdGlscy53cml0ZUljZVBhcmFtZXRlcnMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgcmV0dXJuICdhPWljZS11ZnJhZzonICsgcGFyYW1zLnVzZXJuYW1lRnJhZ21lbnQgKyAnXFxyXFxuJyArXG4gICAgICAnYT1pY2UtcHdkOicgKyBwYXJhbXMucGFzc3dvcmQgKyAnXFxyXFxuJztcbn07XG5cbi8vIFBhcnNlcyB0aGUgU0RQIG1lZGlhIHNlY3Rpb24gYW5kIHJldHVybnMgUlRDUnRwUGFyYW1ldGVycy5cblNEUFV0aWxzLnBhcnNlUnRwUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgZGVzY3JpcHRpb24gPSB7XG4gICAgY29kZWNzOiBbXSxcbiAgICBoZWFkZXJFeHRlbnNpb25zOiBbXSxcbiAgICBmZWNNZWNoYW5pc21zOiBbXSxcbiAgICBydGNwOiBbXVxuICB9O1xuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIHZhciBtbGluZSA9IGxpbmVzWzBdLnNwbGl0KCcgJyk7XG4gIGZvciAodmFyIGkgPSAzOyBpIDwgbWxpbmUubGVuZ3RoOyBpKyspIHsgLy8gZmluZCBhbGwgY29kZWNzIGZyb20gbWxpbmVbMy4uXVxuICAgIHZhciBwdCA9IG1saW5lW2ldO1xuICAgIHZhciBydHBtYXBsaW5lID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoXG4gICAgICAgIG1lZGlhU2VjdGlvbiwgJ2E9cnRwbWFwOicgKyBwdCArICcgJylbMF07XG4gICAgaWYgKHJ0cG1hcGxpbmUpIHtcbiAgICAgIHZhciBjb2RlYyA9IFNEUFV0aWxzLnBhcnNlUnRwTWFwKHJ0cG1hcGxpbmUpO1xuICAgICAgdmFyIGZtdHBzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoXG4gICAgICAgICAgbWVkaWFTZWN0aW9uLCAnYT1mbXRwOicgKyBwdCArICcgJyk7XG4gICAgICAvLyBPbmx5IHRoZSBmaXJzdCBhPWZtdHA6PHB0PiBpcyBjb25zaWRlcmVkLlxuICAgICAgY29kZWMucGFyYW1ldGVycyA9IGZtdHBzLmxlbmd0aCA/IFNEUFV0aWxzLnBhcnNlRm10cChmbXRwc1swXSkgOiB7fTtcbiAgICAgIGNvZGVjLnJ0Y3BGZWVkYmFjayA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KFxuICAgICAgICAgIG1lZGlhU2VjdGlvbiwgJ2E9cnRjcC1mYjonICsgcHQgKyAnICcpXG4gICAgICAgIC5tYXAoU0RQVXRpbHMucGFyc2VSdGNwRmIpO1xuICAgICAgZGVzY3JpcHRpb24uY29kZWNzLnB1c2goY29kZWMpO1xuICAgICAgLy8gcGFyc2UgRkVDIG1lY2hhbmlzbXMgZnJvbSBydHBtYXAgbGluZXMuXG4gICAgICBzd2l0Y2ggKGNvZGVjLm5hbWUudG9VcHBlckNhc2UoKSkge1xuICAgICAgICBjYXNlICdSRUQnOlxuICAgICAgICBjYXNlICdVTFBGRUMnOlxuICAgICAgICAgIGRlc2NyaXB0aW9uLmZlY01lY2hhbmlzbXMucHVzaChjb2RlYy5uYW1lLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiAvLyBvbmx5IFJFRCBhbmQgVUxQRkVDIGFyZSByZWNvZ25pemVkIGFzIEZFQyBtZWNoYW5pc21zLlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPWV4dG1hcDonKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICBkZXNjcmlwdGlvbi5oZWFkZXJFeHRlbnNpb25zLnB1c2goU0RQVXRpbHMucGFyc2VFeHRtYXAobGluZSkpO1xuICB9KTtcbiAgLy8gRklYTUU6IHBhcnNlIHJ0Y3AuXG4gIHJldHVybiBkZXNjcmlwdGlvbjtcbn07XG5cbi8vIEdlbmVyYXRlcyBwYXJ0cyBvZiB0aGUgU0RQIG1lZGlhIHNlY3Rpb24gZGVzY3JpYmluZyB0aGUgY2FwYWJpbGl0aWVzIC9cbi8vIHBhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZVJ0cERlc2NyaXB0aW9uID0gZnVuY3Rpb24oa2luZCwgY2Fwcykge1xuICB2YXIgc2RwID0gJyc7XG5cbiAgLy8gQnVpbGQgdGhlIG1saW5lLlxuICBzZHAgKz0gJ209JyArIGtpbmQgKyAnICc7XG4gIHNkcCArPSBjYXBzLmNvZGVjcy5sZW5ndGggPiAwID8gJzknIDogJzAnOyAvLyByZWplY3QgaWYgbm8gY29kZWNzLlxuICBzZHAgKz0gJyBVRFAvVExTL1JUUC9TQVZQRiAnO1xuICBzZHAgKz0gY2Fwcy5jb2RlY3MubWFwKGZ1bmN0aW9uKGNvZGVjKSB7XG4gICAgaWYgKGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvZGVjLnBheWxvYWRUeXBlO1xuICB9KS5qb2luKCcgJykgKyAnXFxyXFxuJztcblxuICBzZHAgKz0gJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nO1xuICBzZHAgKz0gJ2E9cnRjcDo5IElOIElQNCAwLjAuMC4wXFxyXFxuJztcblxuICAvLyBBZGQgYT1ydHBtYXAgbGluZXMgZm9yIGVhY2ggY29kZWMuIEFsc28gZm10cCBhbmQgcnRjcC1mYi5cbiAgY2Fwcy5jb2RlY3MuZm9yRWFjaChmdW5jdGlvbihjb2RlYykge1xuICAgIHNkcCArPSBTRFBVdGlscy53cml0ZVJ0cE1hcChjb2RlYyk7XG4gICAgc2RwICs9IFNEUFV0aWxzLndyaXRlRm10cChjb2RlYyk7XG4gICAgc2RwICs9IFNEUFV0aWxzLndyaXRlUnRjcEZiKGNvZGVjKTtcbiAgfSk7XG4gIHZhciBtYXhwdGltZSA9IDA7XG4gIGNhcHMuY29kZWNzLmZvckVhY2goZnVuY3Rpb24oY29kZWMpIHtcbiAgICBpZiAoY29kZWMubWF4cHRpbWUgPiBtYXhwdGltZSkge1xuICAgICAgbWF4cHRpbWUgPSBjb2RlYy5tYXhwdGltZTtcbiAgICB9XG4gIH0pO1xuICBpZiAobWF4cHRpbWUgPiAwKSB7XG4gICAgc2RwICs9ICdhPW1heHB0aW1lOicgKyBtYXhwdGltZSArICdcXHJcXG4nO1xuICB9XG4gIHNkcCArPSAnYT1ydGNwLW11eFxcclxcbic7XG5cbiAgY2Fwcy5oZWFkZXJFeHRlbnNpb25zLmZvckVhY2goZnVuY3Rpb24oZXh0ZW5zaW9uKSB7XG4gICAgc2RwICs9IFNEUFV0aWxzLndyaXRlRXh0bWFwKGV4dGVuc2lvbik7XG4gIH0pO1xuICAvLyBGSVhNRTogd3JpdGUgZmVjTWVjaGFuaXNtcy5cbiAgcmV0dXJuIHNkcDtcbn07XG5cbi8vIFBhcnNlcyB0aGUgU0RQIG1lZGlhIHNlY3Rpb24gYW5kIHJldHVybnMgYW4gYXJyYXkgb2Zcbi8vIFJUQ1J0cEVuY29kaW5nUGFyYW1ldGVycy5cblNEUFV0aWxzLnBhcnNlUnRwRW5jb2RpbmdQYXJhbWV0ZXJzID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBlbmNvZGluZ1BhcmFtZXRlcnMgPSBbXTtcbiAgdmFyIGRlc2NyaXB0aW9uID0gU0RQVXRpbHMucGFyc2VSdHBQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbik7XG4gIHZhciBoYXNSZWQgPSBkZXNjcmlwdGlvbi5mZWNNZWNoYW5pc21zLmluZGV4T2YoJ1JFRCcpICE9PSAtMTtcbiAgdmFyIGhhc1VscGZlYyA9IGRlc2NyaXB0aW9uLmZlY01lY2hhbmlzbXMuaW5kZXhPZignVUxQRkVDJykgIT09IC0xO1xuXG4gIC8vIGZpbHRlciBhPXNzcmM6Li4uIGNuYW1lOiwgaWdub3JlIFBsYW5CLW1zaWRcbiAgdmFyIHNzcmNzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1zc3JjOicpXG4gIC5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgIHJldHVybiBTRFBVdGlscy5wYXJzZVNzcmNNZWRpYShsaW5lKTtcbiAgfSlcbiAgLmZpbHRlcihmdW5jdGlvbihwYXJ0cykge1xuICAgIHJldHVybiBwYXJ0cy5hdHRyaWJ1dGUgPT09ICdjbmFtZSc7XG4gIH0pO1xuICB2YXIgcHJpbWFyeVNzcmMgPSBzc3Jjcy5sZW5ndGggPiAwICYmIHNzcmNzWzBdLnNzcmM7XG4gIHZhciBzZWNvbmRhcnlTc3JjO1xuXG4gIHZhciBmbG93cyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9c3NyYy1ncm91cDpGSUQnKVxuICAubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCcgJyk7XG4gICAgcGFydHMuc2hpZnQoKTtcbiAgICByZXR1cm4gcGFydHMubWFwKGZ1bmN0aW9uKHBhcnQpIHtcbiAgICAgIHJldHVybiBwYXJzZUludChwYXJ0LCAxMCk7XG4gICAgfSk7XG4gIH0pO1xuICBpZiAoZmxvd3MubGVuZ3RoID4gMCAmJiBmbG93c1swXS5sZW5ndGggPiAxICYmIGZsb3dzWzBdWzBdID09PSBwcmltYXJ5U3NyYykge1xuICAgIHNlY29uZGFyeVNzcmMgPSBmbG93c1swXVsxXTtcbiAgfVxuXG4gIGRlc2NyaXB0aW9uLmNvZGVjcy5mb3JFYWNoKGZ1bmN0aW9uKGNvZGVjKSB7XG4gICAgaWYgKGNvZGVjLm5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ1JUWCcgJiYgY29kZWMucGFyYW1ldGVycy5hcHQpIHtcbiAgICAgIHZhciBlbmNQYXJhbSA9IHtcbiAgICAgICAgc3NyYzogcHJpbWFyeVNzcmMsXG4gICAgICAgIGNvZGVjUGF5bG9hZFR5cGU6IHBhcnNlSW50KGNvZGVjLnBhcmFtZXRlcnMuYXB0LCAxMCksXG4gICAgICAgIHJ0eDoge1xuICAgICAgICAgIHNzcmM6IHNlY29uZGFyeVNzcmNcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGVuY29kaW5nUGFyYW1ldGVycy5wdXNoKGVuY1BhcmFtKTtcbiAgICAgIGlmIChoYXNSZWQpIHtcbiAgICAgICAgZW5jUGFyYW0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGVuY1BhcmFtKSk7XG4gICAgICAgIGVuY1BhcmFtLmZlYyA9IHtcbiAgICAgICAgICBzc3JjOiBzZWNvbmRhcnlTc3JjLFxuICAgICAgICAgIG1lY2hhbmlzbTogaGFzVWxwZmVjID8gJ3JlZCt1bHBmZWMnIDogJ3JlZCdcbiAgICAgICAgfTtcbiAgICAgICAgZW5jb2RpbmdQYXJhbWV0ZXJzLnB1c2goZW5jUGFyYW0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGlmIChlbmNvZGluZ1BhcmFtZXRlcnMubGVuZ3RoID09PSAwICYmIHByaW1hcnlTc3JjKSB7XG4gICAgZW5jb2RpbmdQYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgc3NyYzogcHJpbWFyeVNzcmNcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHdlIHN1cHBvcnQgYm90aCBiPUFTIGFuZCBiPVRJQVMgYnV0IGludGVycHJldCBBUyBhcyBUSUFTLlxuICB2YXIgYmFuZHdpZHRoID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYj0nKTtcbiAgaWYgKGJhbmR3aWR0aC5sZW5ndGgpIHtcbiAgICBpZiAoYmFuZHdpZHRoWzBdLmluZGV4T2YoJ2I9VElBUzonKSA9PT0gMCkge1xuICAgICAgYmFuZHdpZHRoID0gcGFyc2VJbnQoYmFuZHdpZHRoWzBdLnN1YnN0cig3KSwgMTApO1xuICAgIH0gZWxzZSBpZiAoYmFuZHdpZHRoWzBdLmluZGV4T2YoJ2I9QVM6JykgPT09IDApIHtcbiAgICAgIC8vIHVzZSBmb3JtdWxhIGZyb20gSlNFUCB0byBjb252ZXJ0IGI9QVMgdG8gVElBUyB2YWx1ZS5cbiAgICAgIGJhbmR3aWR0aCA9IHBhcnNlSW50KGJhbmR3aWR0aFswXS5zdWJzdHIoNSksIDEwKSAqIDEwMDAgKiAwLjk1XG4gICAgICAgICAgLSAoNTAgKiA0MCAqIDgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBiYW5kd2lkdGggPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGVuY29kaW5nUGFyYW1ldGVycy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgcGFyYW1zLm1heEJpdHJhdGUgPSBiYW5kd2lkdGg7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGVuY29kaW5nUGFyYW1ldGVycztcbn07XG5cbi8vIHBhcnNlcyBodHRwOi8vZHJhZnQub3J0Yy5vcmcvI3J0Y3J0Y3BwYXJhbWV0ZXJzKlxuU0RQVXRpbHMucGFyc2VSdGNwUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgcnRjcFBhcmFtZXRlcnMgPSB7fTtcblxuICB2YXIgY25hbWU7XG4gIC8vIEdldHMgdGhlIGZpcnN0IFNTUkMuIE5vdGUgdGhhdCB3aXRoIFJUWCB0aGVyZSBtaWdodCBiZSBtdWx0aXBsZVxuICAvLyBTU1JDcy5cbiAgdmFyIHJlbW90ZVNzcmMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNzcmM6JylcbiAgICAgIC5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICByZXR1cm4gU0RQVXRpbHMucGFyc2VTc3JjTWVkaWEobGluZSk7XG4gICAgICB9KVxuICAgICAgLmZpbHRlcihmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iai5hdHRyaWJ1dGUgPT09ICdjbmFtZSc7XG4gICAgICB9KVswXTtcbiAgaWYgKHJlbW90ZVNzcmMpIHtcbiAgICBydGNwUGFyYW1ldGVycy5jbmFtZSA9IHJlbW90ZVNzcmMudmFsdWU7XG4gICAgcnRjcFBhcmFtZXRlcnMuc3NyYyA9IHJlbW90ZVNzcmMuc3NyYztcbiAgfVxuXG4gIC8vIEVkZ2UgdXNlcyB0aGUgY29tcG91bmQgYXR0cmlidXRlIGluc3RlYWQgb2YgcmVkdWNlZFNpemVcbiAgLy8gY29tcG91bmQgaXMgIXJlZHVjZWRTaXplXG4gIHZhciByc2l6ZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9cnRjcC1yc2l6ZScpO1xuICBydGNwUGFyYW1ldGVycy5yZWR1Y2VkU2l6ZSA9IHJzaXplLmxlbmd0aCA+IDA7XG4gIHJ0Y3BQYXJhbWV0ZXJzLmNvbXBvdW5kID0gcnNpemUubGVuZ3RoID09PSAwO1xuXG4gIC8vIHBhcnNlcyB0aGUgcnRjcC1tdXggYXR0ctGWYnV0ZS5cbiAgLy8gTm90ZSB0aGF0IEVkZ2UgZG9lcyBub3Qgc3VwcG9ydCB1bm11eGVkIFJUQ1AuXG4gIHZhciBtdXggPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXJ0Y3AtbXV4Jyk7XG4gIHJ0Y3BQYXJhbWV0ZXJzLm11eCA9IG11eC5sZW5ndGggPiAwO1xuXG4gIHJldHVybiBydGNwUGFyYW1ldGVycztcbn07XG5cbi8vIHBhcnNlcyBlaXRoZXIgYT1tc2lkOiBvciBhPXNzcmM6Li4uIG1zaWQgbGluZXMgYW5kIHJldHVybnNcbi8vIHRoZSBpZCBvZiB0aGUgTWVkaWFTdHJlYW0gYW5kIE1lZGlhU3RyZWFtVHJhY2suXG5TRFBVdGlscy5wYXJzZU1zaWQgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIHBhcnRzO1xuICB2YXIgc3BlYyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9bXNpZDonKTtcbiAgaWYgKHNwZWMubGVuZ3RoID09PSAxKSB7XG4gICAgcGFydHMgPSBzcGVjWzBdLnN1YnN0cig3KS5zcGxpdCgnICcpO1xuICAgIHJldHVybiB7c3RyZWFtOiBwYXJ0c1swXSwgdHJhY2s6IHBhcnRzWzFdfTtcbiAgfVxuICB2YXIgcGxhbkIgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNzcmM6JylcbiAgLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgcmV0dXJuIFNEUFV0aWxzLnBhcnNlU3NyY01lZGlhKGxpbmUpO1xuICB9KVxuICAuZmlsdGVyKGZ1bmN0aW9uKHBhcnRzKSB7XG4gICAgcmV0dXJuIHBhcnRzLmF0dHJpYnV0ZSA9PT0gJ21zaWQnO1xuICB9KTtcbiAgaWYgKHBsYW5CLmxlbmd0aCA+IDApIHtcbiAgICBwYXJ0cyA9IHBsYW5CWzBdLnZhbHVlLnNwbGl0KCcgJyk7XG4gICAgcmV0dXJuIHtzdHJlYW06IHBhcnRzWzBdLCB0cmFjazogcGFydHNbMV19O1xuICB9XG59O1xuXG4vLyBHZW5lcmF0ZSBhIHNlc3Npb24gSUQgZm9yIFNEUC5cbi8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1pZXRmLXJ0Y3dlYi1qc2VwLTIwI3NlY3Rpb24tNS4yLjFcbi8vIHJlY29tbWVuZHMgdXNpbmcgYSBjcnlwdG9ncmFwaGljYWxseSByYW5kb20gK3ZlIDY0LWJpdCB2YWx1ZVxuLy8gYnV0IHJpZ2h0IG5vdyB0aGlzIHNob3VsZCBiZSBhY2NlcHRhYmxlIGFuZCB3aXRoaW4gdGhlIHJpZ2h0IHJhbmdlXG5TRFBVdGlscy5nZW5lcmF0ZVNlc3Npb25JZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygpLnN1YnN0cigyLCAyMSk7XG59O1xuXG4vLyBXcml0ZSBib2lsZGVyIHBsYXRlIGZvciBzdGFydCBvZiBTRFBcbi8vIHNlc3NJZCBhcmd1bWVudCBpcyBvcHRpb25hbCAtIGlmIG5vdCBzdXBwbGllZCBpdCB3aWxsXG4vLyBiZSBnZW5lcmF0ZWQgcmFuZG9tbHlcbi8vIHNlc3NWZXJzaW9uIGlzIG9wdGlvbmFsIGFuZCBkZWZhdWx0cyB0byAyXG5TRFBVdGlscy53cml0ZVNlc3Npb25Cb2lsZXJwbGF0ZSA9IGZ1bmN0aW9uKHNlc3NJZCwgc2Vzc1Zlcikge1xuICB2YXIgc2Vzc2lvbklkO1xuICB2YXIgdmVyc2lvbiA9IHNlc3NWZXIgIT09IHVuZGVmaW5lZCA/IHNlc3NWZXIgOiAyO1xuICBpZiAoc2Vzc0lkKSB7XG4gICAgc2Vzc2lvbklkID0gc2Vzc0lkO1xuICB9IGVsc2Uge1xuICAgIHNlc3Npb25JZCA9IFNEUFV0aWxzLmdlbmVyYXRlU2Vzc2lvbklkKCk7XG4gIH1cbiAgLy8gRklYTUU6IHNlc3MtaWQgc2hvdWxkIGJlIGFuIE5UUCB0aW1lc3RhbXAuXG4gIHJldHVybiAndj0wXFxyXFxuJyArXG4gICAgICAnbz10aGlzaXNhZGFwdGVyb3J0YyAnICsgc2Vzc2lvbklkICsgJyAnICsgdmVyc2lvbiArICcgSU4gSVA0IDEyNy4wLjAuMVxcclxcbicgK1xuICAgICAgJ3M9LVxcclxcbicgK1xuICAgICAgJ3Q9MCAwXFxyXFxuJztcbn07XG5cblNEUFV0aWxzLndyaXRlTWVkaWFTZWN0aW9uID0gZnVuY3Rpb24odHJhbnNjZWl2ZXIsIGNhcHMsIHR5cGUsIHN0cmVhbSkge1xuICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVSdHBEZXNjcmlwdGlvbih0cmFuc2NlaXZlci5raW5kLCBjYXBzKTtcblxuICAvLyBNYXAgSUNFIHBhcmFtZXRlcnMgKHVmcmFnLCBwd2QpIHRvIFNEUC5cbiAgc2RwICs9IFNEUFV0aWxzLndyaXRlSWNlUGFyYW1ldGVycyhcbiAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLmdldExvY2FsUGFyYW1ldGVycygpKTtcblxuICAvLyBNYXAgRFRMUyBwYXJhbWV0ZXJzIHRvIFNEUC5cbiAgc2RwICs9IFNEUFV0aWxzLndyaXRlRHRsc1BhcmFtZXRlcnMoXG4gICAgICB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LmdldExvY2FsUGFyYW1ldGVycygpLFxuICAgICAgdHlwZSA9PT0gJ29mZmVyJyA/ICdhY3RwYXNzJyA6ICdhY3RpdmUnKTtcblxuICBzZHAgKz0gJ2E9bWlkOicgKyB0cmFuc2NlaXZlci5taWQgKyAnXFxyXFxuJztcblxuICBpZiAodHJhbnNjZWl2ZXIuZGlyZWN0aW9uKSB7XG4gICAgc2RwICs9ICdhPScgKyB0cmFuc2NlaXZlci5kaXJlY3Rpb24gKyAnXFxyXFxuJztcbiAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIgJiYgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICBzZHAgKz0gJ2E9c2VuZHJlY3ZcXHJcXG4nO1xuICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlcikge1xuICAgIHNkcCArPSAnYT1zZW5kb25seVxcclxcbic7XG4gIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICBzZHAgKz0gJ2E9cmVjdm9ubHlcXHJcXG4nO1xuICB9IGVsc2Uge1xuICAgIHNkcCArPSAnYT1pbmFjdGl2ZVxcclxcbic7XG4gIH1cblxuICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyKSB7XG4gICAgLy8gc3BlYy5cbiAgICB2YXIgbXNpZCA9ICdtc2lkOicgKyBzdHJlYW0uaWQgKyAnICcgK1xuICAgICAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIudHJhY2suaWQgKyAnXFxyXFxuJztcbiAgICBzZHAgKz0gJ2E9JyArIG1zaWQ7XG5cbiAgICAvLyBmb3IgQ2hyb21lLlxuICAgIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgK1xuICAgICAgICAnICcgKyBtc2lkO1xuICAgIGlmICh0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgICAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4LnNzcmMgK1xuICAgICAgICAgICcgJyArIG1zaWQ7XG4gICAgICBzZHAgKz0gJ2E9c3NyYy1ncm91cDpGSUQgJyArXG4gICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICsgJyAnICtcbiAgICAgICAgICB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eC5zc3JjICtcbiAgICAgICAgICAnXFxyXFxuJztcbiAgICB9XG4gIH1cbiAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGJlIHdyaXR0ZW4gYnkgd3JpdGVSdHBEZXNjcmlwdGlvbi5cbiAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArXG4gICAgICAnIGNuYW1lOicgKyBTRFBVdGlscy5sb2NhbENOYW1lICsgJ1xcclxcbic7XG4gIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIgJiYgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHguc3NyYyArXG4gICAgICAgICcgY25hbWU6JyArIFNEUFV0aWxzLmxvY2FsQ05hbWUgKyAnXFxyXFxuJztcbiAgfVxuICByZXR1cm4gc2RwO1xufTtcblxuLy8gR2V0cyB0aGUgZGlyZWN0aW9uIGZyb20gdGhlIG1lZGlhU2VjdGlvbiBvciB0aGUgc2Vzc2lvbnBhcnQuXG5TRFBVdGlscy5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KSB7XG4gIC8vIExvb2sgZm9yIHNlbmRyZWN2LCBzZW5kb25seSwgcmVjdm9ubHksIGluYWN0aXZlLCBkZWZhdWx0IHRvIHNlbmRyZWN2LlxuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBzd2l0Y2ggKGxpbmVzW2ldKSB7XG4gICAgICBjYXNlICdhPXNlbmRyZWN2JzpcbiAgICAgIGNhc2UgJ2E9c2VuZG9ubHknOlxuICAgICAgY2FzZSAnYT1yZWN2b25seSc6XG4gICAgICBjYXNlICdhPWluYWN0aXZlJzpcbiAgICAgICAgcmV0dXJuIGxpbmVzW2ldLnN1YnN0cigyKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIEZJWE1FOiBXaGF0IHNob3VsZCBoYXBwZW4gaGVyZT9cbiAgICB9XG4gIH1cbiAgaWYgKHNlc3Npb25wYXJ0KSB7XG4gICAgcmV0dXJuIFNEUFV0aWxzLmdldERpcmVjdGlvbihzZXNzaW9ucGFydCk7XG4gIH1cbiAgcmV0dXJuICdzZW5kcmVjdic7XG59O1xuXG5TRFBVdGlscy5nZXRLaW5kID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBsaW5lcyA9IFNEUFV0aWxzLnNwbGl0TGluZXMobWVkaWFTZWN0aW9uKTtcbiAgdmFyIG1saW5lID0gbGluZXNbMF0uc3BsaXQoJyAnKTtcbiAgcmV0dXJuIG1saW5lWzBdLnN1YnN0cigyKTtcbn07XG5cblNEUFV0aWxzLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgcmV0dXJuIG1lZGlhU2VjdGlvbi5zcGxpdCgnICcsIDIpWzFdID09PSAnMCc7XG59O1xuXG5TRFBVdGlscy5wYXJzZU1MaW5lID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBsaW5lcyA9IFNEUFV0aWxzLnNwbGl0TGluZXMobWVkaWFTZWN0aW9uKTtcbiAgdmFyIHBhcnRzID0gbGluZXNbMF0uc3Vic3RyKDIpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAga2luZDogcGFydHNbMF0sXG4gICAgcG9ydDogcGFyc2VJbnQocGFydHNbMV0sIDEwKSxcbiAgICBwcm90b2NvbDogcGFydHNbMl0sXG4gICAgZm10OiBwYXJ0cy5zbGljZSgzKS5qb2luKCcgJylcbiAgfTtcbn07XG5cblNEUFV0aWxzLnBhcnNlT0xpbmUgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIGxpbmUgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdvPScpWzBdO1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cigyKS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIHVzZXJuYW1lOiBwYXJ0c1swXSxcbiAgICBzZXNzaW9uSWQ6IHBhcnRzWzFdLFxuICAgIHNlc3Npb25WZXJzaW9uOiBwYXJzZUludChwYXJ0c1syXSwgMTApLFxuICAgIG5ldFR5cGU6IHBhcnRzWzNdLFxuICAgIGFkZHJlc3NUeXBlOiBwYXJ0c1s0XSxcbiAgICBhZGRyZXNzOiBwYXJ0c1s1XSxcbiAgfTtcbn1cblxuLy8gRXhwb3NlIHB1YmxpYyBtZXRob2RzLlxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gU0RQVXRpbHM7XG59XG5cbn0se31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4gLyogZXNsaW50LWVudiBub2RlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGFkYXB0ZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9hZGFwdGVyX2ZhY3RvcnkuanMnKTtcbm1vZHVsZS5leHBvcnRzID0gYWRhcHRlckZhY3Rvcnkoe3dpbmRvdzogZ2xvYmFsLndpbmRvd30pO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi9hZGFwdGVyX2ZhY3RvcnkuanNcIjo0fV0sNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbiAvKiBlc2xpbnQtZW52IG5vZGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG4vLyBTaGltbWluZyBzdGFydHMgaGVyZS5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGVwZW5kZW5jaWVzLCBvcHRzKSB7XG4gIHZhciB3aW5kb3cgPSBkZXBlbmRlbmNpZXMgJiYgZGVwZW5kZW5jaWVzLndpbmRvdztcblxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBzaGltQ2hyb21lOiB0cnVlLFxuICAgIHNoaW1GaXJlZm94OiB0cnVlLFxuICAgIHNoaW1FZGdlOiB0cnVlLFxuICAgIHNoaW1TYWZhcmk6IHRydWUsXG4gIH07XG5cbiAgZm9yICh2YXIga2V5IGluIG9wdHMpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChvcHRzLCBrZXkpKSB7XG4gICAgICBvcHRpb25zW2tleV0gPSBvcHRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgLy8gVXRpbHMuXG4gIHZhciBsb2dnaW5nID0gdXRpbHMubG9nO1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG5cbiAgLy8gVW5jb21tZW50IHRoZSBsaW5lIGJlbG93IGlmIHlvdSB3YW50IGxvZ2dpbmcgdG8gb2NjdXIsIGluY2x1ZGluZyBsb2dnaW5nXG4gIC8vIGZvciB0aGUgc3dpdGNoIHN0YXRlbWVudCBiZWxvdy4gQ2FuIGFsc28gYmUgdHVybmVkIG9uIGluIHRoZSBicm93c2VyIHZpYVxuICAvLyBhZGFwdGVyLmRpc2FibGVMb2coZmFsc2UpLCBidXQgdGhlbiBsb2dnaW5nIGZyb20gdGhlIHN3aXRjaCBzdGF0ZW1lbnQgYmVsb3dcbiAgLy8gd2lsbCBub3QgYXBwZWFyLlxuICAvLyByZXF1aXJlKCcuL3V0aWxzJykuZGlzYWJsZUxvZyhmYWxzZSk7XG5cbiAgLy8gQnJvd3NlciBzaGltcy5cbiAgdmFyIGNocm9tZVNoaW0gPSByZXF1aXJlKCcuL2Nocm9tZS9jaHJvbWVfc2hpbScpIHx8IG51bGw7XG4gIHZhciBlZGdlU2hpbSA9IHJlcXVpcmUoJy4vZWRnZS9lZGdlX3NoaW0nKSB8fCBudWxsO1xuICB2YXIgZmlyZWZveFNoaW0gPSByZXF1aXJlKCcuL2ZpcmVmb3gvZmlyZWZveF9zaGltJykgfHwgbnVsbDtcbiAgdmFyIHNhZmFyaVNoaW0gPSByZXF1aXJlKCcuL3NhZmFyaS9zYWZhcmlfc2hpbScpIHx8IG51bGw7XG4gIHZhciBjb21tb25TaGltID0gcmVxdWlyZSgnLi9jb21tb25fc2hpbScpIHx8IG51bGw7XG5cbiAgLy8gRXhwb3J0IHRvIHRoZSBhZGFwdGVyIGdsb2JhbCBvYmplY3QgdmlzaWJsZSBpbiB0aGUgYnJvd3Nlci5cbiAgdmFyIGFkYXB0ZXIgPSB7XG4gICAgYnJvd3NlckRldGFpbHM6IGJyb3dzZXJEZXRhaWxzLFxuICAgIGNvbW1vblNoaW06IGNvbW1vblNoaW0sXG4gICAgZXh0cmFjdFZlcnNpb246IHV0aWxzLmV4dHJhY3RWZXJzaW9uLFxuICAgIGRpc2FibGVMb2c6IHV0aWxzLmRpc2FibGVMb2csXG4gICAgZGlzYWJsZVdhcm5pbmdzOiB1dGlscy5kaXNhYmxlV2FybmluZ3NcbiAgfTtcblxuICAvLyBTaGltIGJyb3dzZXIgaWYgZm91bmQuXG4gIHN3aXRjaCAoYnJvd3NlckRldGFpbHMuYnJvd3Nlcikge1xuICAgIGNhc2UgJ2Nocm9tZSc6XG4gICAgICBpZiAoIWNocm9tZVNoaW0gfHwgIWNocm9tZVNoaW0uc2hpbVBlZXJDb25uZWN0aW9uIHx8XG4gICAgICAgICAgIW9wdGlvbnMuc2hpbUNocm9tZSkge1xuICAgICAgICBsb2dnaW5nKCdDaHJvbWUgc2hpbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhpcyBhZGFwdGVyIHJlbGVhc2UuJyk7XG4gICAgICAgIHJldHVybiBhZGFwdGVyO1xuICAgICAgfVxuICAgICAgbG9nZ2luZygnYWRhcHRlci5qcyBzaGltbWluZyBjaHJvbWUuJyk7XG4gICAgICAvLyBFeHBvcnQgdG8gdGhlIGFkYXB0ZXIgZ2xvYmFsIG9iamVjdCB2aXNpYmxlIGluIHRoZSBicm93c2VyLlxuICAgICAgYWRhcHRlci5icm93c2VyU2hpbSA9IGNocm9tZVNoaW07XG4gICAgICBjb21tb25TaGltLnNoaW1DcmVhdGVPYmplY3RVUkwod2luZG93KTtcblxuICAgICAgY2hyb21lU2hpbS5zaGltR2V0VXNlck1lZGlhKHdpbmRvdyk7XG4gICAgICBjaHJvbWVTaGltLnNoaW1NZWRpYVN0cmVhbSh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltU291cmNlT2JqZWN0KHdpbmRvdyk7XG4gICAgICBjaHJvbWVTaGltLnNoaW1QZWVyQ29ubmVjdGlvbih3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltT25UcmFjayh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltQWRkVHJhY2tSZW1vdmVUcmFjayh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltR2V0U2VuZGVyc1dpdGhEdG1mKHdpbmRvdyk7XG5cbiAgICAgIGNvbW1vblNoaW0uc2hpbVJUQ0ljZUNhbmRpZGF0ZSh3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5zaGltTWF4TWVzc2FnZVNpemUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbVNlbmRUaHJvd1R5cGVFcnJvcih3aW5kb3cpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZmlyZWZveCc6XG4gICAgICBpZiAoIWZpcmVmb3hTaGltIHx8ICFmaXJlZm94U2hpbS5zaGltUGVlckNvbm5lY3Rpb24gfHxcbiAgICAgICAgICAhb3B0aW9ucy5zaGltRmlyZWZveCkge1xuICAgICAgICBsb2dnaW5nKCdGaXJlZm94IHNoaW0gaXMgbm90IGluY2x1ZGVkIGluIHRoaXMgYWRhcHRlciByZWxlYXNlLicpO1xuICAgICAgICByZXR1cm4gYWRhcHRlcjtcbiAgICAgIH1cbiAgICAgIGxvZ2dpbmcoJ2FkYXB0ZXIuanMgc2hpbW1pbmcgZmlyZWZveC4nKTtcbiAgICAgIC8vIEV4cG9ydCB0byB0aGUgYWRhcHRlciBnbG9iYWwgb2JqZWN0IHZpc2libGUgaW4gdGhlIGJyb3dzZXIuXG4gICAgICBhZGFwdGVyLmJyb3dzZXJTaGltID0gZmlyZWZveFNoaW07XG4gICAgICBjb21tb25TaGltLnNoaW1DcmVhdGVPYmplY3RVUkwod2luZG93KTtcblxuICAgICAgZmlyZWZveFNoaW0uc2hpbUdldFVzZXJNZWRpYSh3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbVNvdXJjZU9iamVjdCh3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbVBlZXJDb25uZWN0aW9uKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltT25UcmFjayh3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbVJlbW92ZVN0cmVhbSh3aW5kb3cpO1xuXG4gICAgICBjb21tb25TaGltLnNoaW1SVENJY2VDYW5kaWRhdGUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2VkZ2UnOlxuICAgICAgaWYgKCFlZGdlU2hpbSB8fCAhZWRnZVNoaW0uc2hpbVBlZXJDb25uZWN0aW9uIHx8ICFvcHRpb25zLnNoaW1FZGdlKSB7XG4gICAgICAgIGxvZ2dpbmcoJ01TIGVkZ2Ugc2hpbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhpcyBhZGFwdGVyIHJlbGVhc2UuJyk7XG4gICAgICAgIHJldHVybiBhZGFwdGVyO1xuICAgICAgfVxuICAgICAgbG9nZ2luZygnYWRhcHRlci5qcyBzaGltbWluZyBlZGdlLicpO1xuICAgICAgLy8gRXhwb3J0IHRvIHRoZSBhZGFwdGVyIGdsb2JhbCBvYmplY3QgdmlzaWJsZSBpbiB0aGUgYnJvd3Nlci5cbiAgICAgIGFkYXB0ZXIuYnJvd3NlclNoaW0gPSBlZGdlU2hpbTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbUNyZWF0ZU9iamVjdFVSTCh3aW5kb3cpO1xuXG4gICAgICBlZGdlU2hpbS5zaGltR2V0VXNlck1lZGlhKHdpbmRvdyk7XG4gICAgICBlZGdlU2hpbS5zaGltUGVlckNvbm5lY3Rpb24od2luZG93KTtcbiAgICAgIGVkZ2VTaGltLnNoaW1SZXBsYWNlVHJhY2sod2luZG93KTtcblxuICAgICAgLy8gdGhlIGVkZ2Ugc2hpbSBpbXBsZW1lbnRzIHRoZSBmdWxsIFJUQ0ljZUNhbmRpZGF0ZSBvYmplY3QuXG5cbiAgICAgIGNvbW1vblNoaW0uc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3NhZmFyaSc6XG4gICAgICBpZiAoIXNhZmFyaVNoaW0gfHwgIW9wdGlvbnMuc2hpbVNhZmFyaSkge1xuICAgICAgICBsb2dnaW5nKCdTYWZhcmkgc2hpbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhpcyBhZGFwdGVyIHJlbGVhc2UuJyk7XG4gICAgICAgIHJldHVybiBhZGFwdGVyO1xuICAgICAgfVxuICAgICAgbG9nZ2luZygnYWRhcHRlci5qcyBzaGltbWluZyBzYWZhcmkuJyk7XG4gICAgICAvLyBFeHBvcnQgdG8gdGhlIGFkYXB0ZXIgZ2xvYmFsIG9iamVjdCB2aXNpYmxlIGluIHRoZSBicm93c2VyLlxuICAgICAgYWRhcHRlci5icm93c2VyU2hpbSA9IHNhZmFyaVNoaW07XG4gICAgICBjb21tb25TaGltLnNoaW1DcmVhdGVPYmplY3RVUkwod2luZG93KTtcblxuICAgICAgc2FmYXJpU2hpbS5zaGltUlRDSWNlU2VydmVyVXJscyh3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltQ2FsbGJhY2tzQVBJKHdpbmRvdyk7XG4gICAgICBzYWZhcmlTaGltLnNoaW1Mb2NhbFN0cmVhbXNBUEkod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbVJlbW90ZVN0cmVhbXNBUEkod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbVRyYWNrRXZlbnRUcmFuc2NlaXZlcih3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltR2V0VXNlck1lZGlhKHdpbmRvdyk7XG4gICAgICBzYWZhcmlTaGltLnNoaW1DcmVhdGVPZmZlckxlZ2FjeSh3aW5kb3cpO1xuXG4gICAgICBjb21tb25TaGltLnNoaW1SVENJY2VDYW5kaWRhdGUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBsb2dnaW5nKCdVbnN1cHBvcnRlZCBicm93c2VyIScpO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gYWRhcHRlcjtcbn07XG5cbn0se1wiLi9jaHJvbWUvY2hyb21lX3NoaW1cIjo1LFwiLi9jb21tb25fc2hpbVwiOjcsXCIuL2VkZ2UvZWRnZV9zaGltXCI6OCxcIi4vZmlyZWZveC9maXJlZm94X3NoaW1cIjoxMCxcIi4vc2FmYXJpL3NhZmFyaV9zaGltXCI6MTIsXCIuL3V0aWxzXCI6MTN9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblxuLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4gLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIGxvZ2dpbmcgPSB1dGlscy5sb2c7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzaGltR2V0VXNlck1lZGlhOiByZXF1aXJlKCcuL2dldHVzZXJtZWRpYScpLFxuICBzaGltTWVkaWFTdHJlYW06IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIHdpbmRvdy5NZWRpYVN0cmVhbSA9IHdpbmRvdy5NZWRpYVN0cmVhbSB8fCB3aW5kb3cud2Via2l0TWVkaWFTdHJlYW07XG4gIH0sXG5cbiAgc2hpbU9uVHJhY2s6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgISgnb250cmFjaycgaW5cbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAnb250cmFjaycsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fb250cmFjaztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbihmKSB7XG4gICAgICAgICAgaWYgKHRoaXMuX29udHJhY2spIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndHJhY2snLCB0aGlzLl9vbnRyYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0cmFjaycsIHRoaXMuX29udHJhY2sgPSBmKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uID1cbiAgICAgICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgICBpZiAoIXBjLl9vbnRyYWNrcG9seSkge1xuICAgICAgICAgIHBjLl9vbnRyYWNrcG9seSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIC8vIG9uYWRkc3RyZWFtIGRvZXMgbm90IGZpcmUgd2hlbiBhIHRyYWNrIGlzIGFkZGVkIHRvIGFuIGV4aXN0aW5nXG4gICAgICAgICAgICAvLyBzdHJlYW0uIEJ1dCBzdHJlYW0ub25hZGR0cmFjayBpcyBpbXBsZW1lbnRlZCBzbyB3ZSB1c2UgdGhhdC5cbiAgICAgICAgICAgIGUuc3RyZWFtLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHRyYWNrJywgZnVuY3Rpb24odGUpIHtcbiAgICAgICAgICAgICAgdmFyIHJlY2VpdmVyO1xuICAgICAgICAgICAgICBpZiAod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRSZWNlaXZlcnMpIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlciA9IHBjLmdldFJlY2VpdmVycygpLmZpbmQoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHIudHJhY2sgJiYgci50cmFjay5pZCA9PT0gdGUudHJhY2suaWQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZXIgPSB7dHJhY2s6IHRlLnRyYWNrfTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgndHJhY2snKTtcbiAgICAgICAgICAgICAgZXZlbnQudHJhY2sgPSB0ZS50cmFjaztcbiAgICAgICAgICAgICAgZXZlbnQucmVjZWl2ZXIgPSByZWNlaXZlcjtcbiAgICAgICAgICAgICAgZXZlbnQudHJhbnNjZWl2ZXIgPSB7cmVjZWl2ZXI6IHJlY2VpdmVyfTtcbiAgICAgICAgICAgICAgZXZlbnQuc3RyZWFtcyA9IFtlLnN0cmVhbV07XG4gICAgICAgICAgICAgIHBjLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlLnN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgICAgICAgIHZhciByZWNlaXZlcjtcbiAgICAgICAgICAgICAgaWYgKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVjZWl2ZXJzKSB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZXIgPSBwYy5nZXRSZWNlaXZlcnMoKS5maW5kKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiByLnRyYWNrICYmIHIudHJhY2suaWQgPT09IHRyYWNrLmlkO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlY2VpdmVyID0ge3RyYWNrOiB0cmFja307XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCd0cmFjaycpO1xuICAgICAgICAgICAgICBldmVudC50cmFjayA9IHRyYWNrO1xuICAgICAgICAgICAgICBldmVudC5yZWNlaXZlciA9IHJlY2VpdmVyO1xuICAgICAgICAgICAgICBldmVudC50cmFuc2NlaXZlciA9IHtyZWNlaXZlcjogcmVjZWl2ZXJ9O1xuICAgICAgICAgICAgICBldmVudC5zdHJlYW1zID0gW2Uuc3RyZWFtXTtcbiAgICAgICAgICAgICAgcGMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHBjLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIHBjLl9vbnRyYWNrcG9seSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9yaWdTZXRSZW1vdGVEZXNjcmlwdGlvbi5hcHBseShwYywgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmICghKCdSVENSdHBUcmFuc2NlaXZlcicgaW4gd2luZG93KSkge1xuICAgICAgdXRpbHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCAndHJhY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmICghZS50cmFuc2NlaXZlcikge1xuICAgICAgICAgIGUudHJhbnNjZWl2ZXIgPSB7cmVjZWl2ZXI6IGUucmVjZWl2ZXJ9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIHNoaW1HZXRTZW5kZXJzV2l0aER0bWY6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIC8vIE92ZXJyaWRlcyBhZGRUcmFjay9yZW1vdmVUcmFjaywgZGVwZW5kcyBvbiBzaGltQWRkVHJhY2tSZW1vdmVUcmFjay5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmXG4gICAgICAgICEoJ2dldFNlbmRlcnMnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpICYmXG4gICAgICAgICdjcmVhdGVEVE1GU2VuZGVyJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSB7XG4gICAgICB2YXIgc2hpbVNlbmRlcldpdGhEdG1mID0gZnVuY3Rpb24ocGMsIHRyYWNrKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHJhY2s6IHRyYWNrLFxuICAgICAgICAgIGdldCBkdG1mKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2R0bWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBpZiAodHJhY2sua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBwYy5jcmVhdGVEVE1GU2VuZGVyKHRyYWNrKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kdG1mID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2R0bWY7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBfcGM6IHBjXG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gICAgICAvLyBhdWdtZW50IGFkZFRyYWNrIHdoZW4gZ2V0U2VuZGVycyBpcyBub3QgYXZhaWxhYmxlLlxuICAgICAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnMpIHtcbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5fc2VuZGVycyA9IHRoaXMuX3NlbmRlcnMgfHwgW107XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3NlbmRlcnMuc2xpY2UoKTsgLy8gcmV0dXJuIGEgY29weSBvZiB0aGUgaW50ZXJuYWwgc3RhdGUuXG4gICAgICAgIH07XG4gICAgICAgIHZhciBvcmlnQWRkVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrO1xuICAgICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24odHJhY2ssIHN0cmVhbSkge1xuICAgICAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICAgICAgdmFyIHNlbmRlciA9IG9yaWdBZGRUcmFjay5hcHBseShwYywgYXJndW1lbnRzKTtcbiAgICAgICAgICBpZiAoIXNlbmRlcikge1xuICAgICAgICAgICAgc2VuZGVyID0gc2hpbVNlbmRlcldpdGhEdG1mKHBjLCB0cmFjayk7XG4gICAgICAgICAgICBwYy5fc2VuZGVycy5wdXNoKHNlbmRlcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZW5kZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG9yaWdSZW1vdmVUcmFjayA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlVHJhY2s7XG4gICAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlVHJhY2sgPSBmdW5jdGlvbihzZW5kZXIpIHtcbiAgICAgICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgICAgIG9yaWdSZW1vdmVUcmFjay5hcHBseShwYywgYXJndW1lbnRzKTtcbiAgICAgICAgICB2YXIgaWR4ID0gcGMuX3NlbmRlcnMuaW5kZXhPZihzZW5kZXIpO1xuICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICBwYy5fc2VuZGVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICB2YXIgb3JpZ0FkZFN0cmVhbSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgICAgcGMuX3NlbmRlcnMgPSBwYy5fc2VuZGVycyB8fCBbXTtcbiAgICAgICAgb3JpZ0FkZFN0cmVhbS5hcHBseShwYywgW3N0cmVhbV0pO1xuICAgICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0cmFjaykge1xuICAgICAgICAgIHBjLl9zZW5kZXJzLnB1c2goc2hpbVNlbmRlcldpdGhEdG1mKHBjLCB0cmFjaykpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBvcmlnUmVtb3ZlU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW07XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgICBwYy5fc2VuZGVycyA9IHBjLl9zZW5kZXJzIHx8IFtdO1xuICAgICAgICBvcmlnUmVtb3ZlU3RyZWFtLmFwcGx5KHBjLCBbc3RyZWFtXSk7XG5cbiAgICAgICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcbiAgICAgICAgICB2YXIgc2VuZGVyID0gcGMuX3NlbmRlcnMuZmluZChmdW5jdGlvbihzKSB7XG4gICAgICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHNlbmRlcikge1xuICAgICAgICAgICAgcGMuX3NlbmRlcnMuc3BsaWNlKHBjLl9zZW5kZXJzLmluZGV4T2Yoc2VuZGVyKSwgMSk7IC8vIHJlbW92ZSBzZW5kZXJcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJlxuICAgICAgICAgICAgICAgJ2dldFNlbmRlcnMnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUgJiZcbiAgICAgICAgICAgICAgICdjcmVhdGVEVE1GU2VuZGVyJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlICYmXG4gICAgICAgICAgICAgICB3aW5kb3cuUlRDUnRwU2VuZGVyICYmXG4gICAgICAgICAgICAgICAhKCdkdG1mJyBpbiB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZSkpIHtcbiAgICAgIHZhciBvcmlnR2V0U2VuZGVycyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycztcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgICB2YXIgc2VuZGVycyA9IG9yaWdHZXRTZW5kZXJzLmFwcGx5KHBjLCBbXSk7XG4gICAgICAgIHNlbmRlcnMuZm9yRWFjaChmdW5jdGlvbihzZW5kZXIpIHtcbiAgICAgICAgICBzZW5kZXIuX3BjID0gcGM7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc2VuZGVycztcbiAgICAgIH07XG5cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZSwgJ2R0bWYnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHRoaXMuX2R0bWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudHJhY2sua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgICAgICB0aGlzLl9kdG1mID0gdGhpcy5fcGMuY3JlYXRlRFRNRlNlbmRlcih0aGlzLnRyYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fZHRtZjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIHNoaW1Tb3VyY2VPYmplY3Q6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIHZhciBVUkwgPSB3aW5kb3cgJiYgd2luZG93LlVSTDtcblxuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50ICYmXG4gICAgICAgICEoJ3NyY09iamVjdCcgaW4gd2luZG93LkhUTUxNZWRpYUVsZW1lbnQucHJvdG90eXBlKSkge1xuICAgICAgICAvLyBTaGltIHRoZSBzcmNPYmplY3QgcHJvcGVydHksIG9uY2UsIHdoZW4gSFRNTE1lZGlhRWxlbWVudCBpcyBmb3VuZC5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50LnByb3RvdHlwZSwgJ3NyY09iamVjdCcsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NyY09iamVjdDtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAvLyBVc2UgX3NyY09iamVjdCBhcyBhIHByaXZhdGUgcHJvcGVydHkgZm9yIHRoaXMgc2hpbVxuICAgICAgICAgICAgdGhpcy5fc3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3JjKSB7XG4gICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5zcmMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXN0cmVhbSkge1xuICAgICAgICAgICAgICB0aGlzLnNyYyA9ICcnO1xuICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHJlY3JlYXRlIHRoZSBibG9iIHVybCB3aGVuIGEgdHJhY2sgaXMgYWRkZWQgb3JcbiAgICAgICAgICAgIC8vIHJlbW92ZWQuIERvaW5nIGl0IG1hbnVhbGx5IHNpbmNlIHdlIHdhbnQgdG8gYXZvaWQgYSByZWN1cnNpb24uXG4gICAgICAgICAgICBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcignYWRkdHJhY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKHNlbGYuc3JjKSB7XG4gICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChzZWxmLnNyYyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc2VsZi5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0cmVhbS5hZGRFdmVudExpc3RlbmVyKCdyZW1vdmV0cmFjaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoc2VsZi5zcmMpIHtcbiAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHNlbGYuc3JjKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzZWxmLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNoaW1BZGRUcmFja1JlbW92ZVRyYWNrV2l0aE5hdGl2ZTogZnVuY3Rpb24od2luZG93KSB7XG4gICAgLy8gc2hpbSBhZGRUcmFjay9yZW1vdmVUcmFjayB3aXRoIG5hdGl2ZSB2YXJpYW50cyBpbiBvcmRlciB0byBtYWtlXG4gICAgLy8gdGhlIGludGVyYWN0aW9ucyB3aXRoIGxlZ2FjeSBnZXRMb2NhbFN0cmVhbXMgYmVoYXZlIGFzIGluIG90aGVyIGJyb3dzZXJzLlxuICAgIC8vIEtlZXBzIGEgbWFwcGluZyBzdHJlYW0uaWQgPT4gW3N0cmVhbSwgcnRwc2VuZGVycy4uLl1cbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldExvY2FsU3RyZWFtcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgPSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zIHx8IHt9O1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMpLm1hcChmdW5jdGlvbihzdHJlYW1JZCkge1xuICAgICAgICByZXR1cm4gcGMuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtSWRdWzBdO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBvcmlnQWRkVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbih0cmFjaywgc3RyZWFtKSB7XG4gICAgICBpZiAoIXN0cmVhbSkge1xuICAgICAgICByZXR1cm4gb3JpZ0FkZFRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zID0gdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyB8fCB7fTtcblxuICAgICAgdmFyIHNlbmRlciA9IG9yaWdBZGRUcmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKCF0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF0pIHtcbiAgICAgICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdID0gW3N0cmVhbSwgc2VuZGVyXTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdLmluZGV4T2Yoc2VuZGVyKSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdLnB1c2goc2VuZGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZW5kZXI7XG4gICAgfTtcblxuICAgIHZhciBvcmlnQWRkU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW07XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zID0gdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyB8fCB7fTtcblxuICAgICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcbiAgICAgICAgdmFyIGFscmVhZHlFeGlzdHMgPSBwYy5nZXRTZW5kZXJzKCkuZmluZChmdW5jdGlvbihzKSB7XG4gICAgICAgICAgcmV0dXJuIHMudHJhY2sgPT09IHRyYWNrO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGFscmVhZHlFeGlzdHMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUcmFjayBhbHJlYWR5IGV4aXN0cy4nLFxuICAgICAgICAgICAgICAnSW52YWxpZEFjY2Vzc0Vycm9yJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIGV4aXN0aW5nU2VuZGVycyA9IHBjLmdldFNlbmRlcnMoKTtcbiAgICAgIG9yaWdBZGRTdHJlYW0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHZhciBuZXdTZW5kZXJzID0gcGMuZ2V0U2VuZGVycygpLmZpbHRlcihmdW5jdGlvbihuZXdTZW5kZXIpIHtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nU2VuZGVycy5pbmRleE9mKG5ld1NlbmRlcikgPT09IC0xO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF0gPSBbc3RyZWFtXS5jb25jYXQobmV3U2VuZGVycyk7XG4gICAgfTtcblxuICAgIHZhciBvcmlnUmVtb3ZlU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW07XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgPSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zIHx8IHt9O1xuICAgICAgZGVsZXRlIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtLmlkXTtcbiAgICAgIHJldHVybiBvcmlnUmVtb3ZlU3RyZWFtLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIHZhciBvcmlnUmVtb3ZlVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVRyYWNrO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlVHJhY2sgPSBmdW5jdGlvbihzZW5kZXIpIHtcbiAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zID0gdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyB8fCB7fTtcbiAgICAgIGlmIChzZW5kZXIpIHtcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcykuZm9yRWFjaChmdW5jdGlvbihzdHJlYW1JZCkge1xuICAgICAgICAgIHZhciBpZHggPSBwYy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW1JZF0uaW5kZXhPZihzZW5kZXIpO1xuICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICBwYy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW1JZF0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwYy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW1JZF0ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgcGMuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtSWRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ1JlbW92ZVRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSxcblxuICBzaGltQWRkVHJhY2tSZW1vdmVUcmFjazogZnVuY3Rpb24od2luZG93KSB7XG4gICAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuICAgIC8vIHNoaW0gYWRkVHJhY2sgYW5kIHJlbW92ZVRyYWNrLlxuICAgIGlmICh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrICYmXG4gICAgICAgIGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPj0gNjUpIHtcbiAgICAgIHJldHVybiB0aGlzLnNoaW1BZGRUcmFja1JlbW92ZVRyYWNrV2l0aE5hdGl2ZSh3aW5kb3cpO1xuICAgIH1cblxuICAgIC8vIGFsc28gc2hpbSBwYy5nZXRMb2NhbFN0cmVhbXMgd2hlbiBhZGRUcmFjayBpcyBzaGltbWVkXG4gICAgLy8gdG8gcmV0dXJuIHRoZSBvcmlnaW5hbCBzdHJlYW1zLlxuICAgIHZhciBvcmlnR2V0TG9jYWxTdHJlYW1zID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVxuICAgICAgICAuZ2V0TG9jYWxTdHJlYW1zO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0TG9jYWxTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgdmFyIG5hdGl2ZVN0cmVhbXMgPSBvcmlnR2V0TG9jYWxTdHJlYW1zLmFwcGx5KHRoaXMpO1xuICAgICAgcGMuX3JldmVyc2VTdHJlYW1zID0gcGMuX3JldmVyc2VTdHJlYW1zIHx8IHt9O1xuICAgICAgcmV0dXJuIG5hdGl2ZVN0cmVhbXMubWFwKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gcGMuX3JldmVyc2VTdHJlYW1zW3N0cmVhbS5pZF07XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIG9yaWdBZGRTdHJlYW0gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbTtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgIHBjLl9zdHJlYW1zID0gcGMuX3N0cmVhbXMgfHwge307XG4gICAgICBwYy5fcmV2ZXJzZVN0cmVhbXMgPSBwYy5fcmV2ZXJzZVN0cmVhbXMgfHwge307XG5cbiAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgIHZhciBhbHJlYWR5RXhpc3RzID0gcGMuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24ocykge1xuICAgICAgICAgIHJldHVybiBzLnRyYWNrID09PSB0cmFjaztcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChhbHJlYWR5RXhpc3RzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignVHJhY2sgYWxyZWFkeSBleGlzdHMuJyxcbiAgICAgICAgICAgICAgJ0ludmFsaWRBY2Nlc3NFcnJvcicpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIEFkZCBpZGVudGl0eSBtYXBwaW5nIGZvciBjb25zaXN0ZW5jeSB3aXRoIGFkZFRyYWNrLlxuICAgICAgLy8gVW5sZXNzIHRoaXMgaXMgYmVpbmcgdXNlZCB3aXRoIGEgc3RyZWFtIGZyb20gYWRkVHJhY2suXG4gICAgICBpZiAoIXBjLl9yZXZlcnNlU3RyZWFtc1tzdHJlYW0uaWRdKSB7XG4gICAgICAgIHZhciBuZXdTdHJlYW0gPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKHN0cmVhbS5nZXRUcmFja3MoKSk7XG4gICAgICAgIHBjLl9zdHJlYW1zW3N0cmVhbS5pZF0gPSBuZXdTdHJlYW07XG4gICAgICAgIHBjLl9yZXZlcnNlU3RyZWFtc1tuZXdTdHJlYW0uaWRdID0gc3RyZWFtO1xuICAgICAgICBzdHJlYW0gPSBuZXdTdHJlYW07XG4gICAgICB9XG4gICAgICBvcmlnQWRkU3RyZWFtLmFwcGx5KHBjLCBbc3RyZWFtXSk7XG4gICAgfTtcblxuICAgIHZhciBvcmlnUmVtb3ZlU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW07XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICBwYy5fc3RyZWFtcyA9IHBjLl9zdHJlYW1zIHx8IHt9O1xuICAgICAgcGMuX3JldmVyc2VTdHJlYW1zID0gcGMuX3JldmVyc2VTdHJlYW1zIHx8IHt9O1xuXG4gICAgICBvcmlnUmVtb3ZlU3RyZWFtLmFwcGx5KHBjLCBbKHBjLl9zdHJlYW1zW3N0cmVhbS5pZF0gfHwgc3RyZWFtKV0pO1xuICAgICAgZGVsZXRlIHBjLl9yZXZlcnNlU3RyZWFtc1socGMuX3N0cmVhbXNbc3RyZWFtLmlkXSA/XG4gICAgICAgICAgcGMuX3N0cmVhbXNbc3RyZWFtLmlkXS5pZCA6IHN0cmVhbS5pZCldO1xuICAgICAgZGVsZXRlIHBjLl9zdHJlYW1zW3N0cmVhbS5pZF07XG4gICAgfTtcblxuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbih0cmFjaywgc3RyZWFtKSB7XG4gICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgaWYgKHBjLnNpZ25hbGluZ1N0YXRlID09PSAnY2xvc2VkJykge1xuICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKFxuICAgICAgICAgICdUaGUgUlRDUGVlckNvbm5lY3Rpb25cXCdzIHNpZ25hbGluZ1N0YXRlIGlzIFxcJ2Nsb3NlZFxcJy4nLFxuICAgICAgICAgICdJbnZhbGlkU3RhdGVFcnJvcicpO1xuICAgICAgfVxuICAgICAgdmFyIHN0cmVhbXMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBpZiAoc3RyZWFtcy5sZW5ndGggIT09IDEgfHxcbiAgICAgICAgICAhc3RyZWFtc1swXS5nZXRUcmFja3MoKS5maW5kKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgIHJldHVybiB0ID09PSB0cmFjaztcbiAgICAgICAgICB9KSkge1xuICAgICAgICAvLyB0aGlzIGlzIG5vdCBmdWxseSBjb3JyZWN0IGJ1dCBhbGwgd2UgY2FuIG1hbmFnZSB3aXRob3V0XG4gICAgICAgIC8vIFtbYXNzb2NpYXRlZCBNZWRpYVN0cmVhbXNdXSBpbnRlcm5hbCBzbG90LlxuICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKFxuICAgICAgICAgICdUaGUgYWRhcHRlci5qcyBhZGRUcmFjayBwb2x5ZmlsbCBvbmx5IHN1cHBvcnRzIGEgc2luZ2xlICcgK1xuICAgICAgICAgICcgc3RyZWFtIHdoaWNoIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgc3BlY2lmaWVkIHRyYWNrLicsXG4gICAgICAgICAgJ05vdFN1cHBvcnRlZEVycm9yJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBhbHJlYWR5RXhpc3RzID0gcGMuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24ocykge1xuICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICB9KTtcbiAgICAgIGlmIChhbHJlYWR5RXhpc3RzKSB7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1RyYWNrIGFscmVhZHkgZXhpc3RzLicsXG4gICAgICAgICAgICAnSW52YWxpZEFjY2Vzc0Vycm9yJyk7XG4gICAgICB9XG5cbiAgICAgIHBjLl9zdHJlYW1zID0gcGMuX3N0cmVhbXMgfHwge307XG4gICAgICBwYy5fcmV2ZXJzZVN0cmVhbXMgPSBwYy5fcmV2ZXJzZVN0cmVhbXMgfHwge307XG4gICAgICB2YXIgb2xkU3RyZWFtID0gcGMuX3N0cmVhbXNbc3RyZWFtLmlkXTtcbiAgICAgIGlmIChvbGRTdHJlYW0pIHtcbiAgICAgICAgLy8gdGhpcyBpcyB1c2luZyBvZGQgQ2hyb21lIGJlaGF2aW91ciwgdXNlIHdpdGggY2F1dGlvbjpcbiAgICAgICAgLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTc4MTVcbiAgICAgICAgLy8gTm90ZTogd2UgcmVseSBvbiB0aGUgaGlnaC1sZXZlbCBhZGRUcmFjay9kdG1mIHNoaW0gdG9cbiAgICAgICAgLy8gY3JlYXRlIHRoZSBzZW5kZXIgd2l0aCBhIGR0bWYgc2VuZGVyLlxuICAgICAgICBvbGRTdHJlYW0uYWRkVHJhY2sodHJhY2spO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgT05OIGFzeW5jLlxuICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHBjLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCduZWdvdGlhdGlvbm5lZWRlZCcpKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbmV3U3RyZWFtID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbShbdHJhY2tdKTtcbiAgICAgICAgcGMuX3N0cmVhbXNbc3RyZWFtLmlkXSA9IG5ld1N0cmVhbTtcbiAgICAgICAgcGMuX3JldmVyc2VTdHJlYW1zW25ld1N0cmVhbS5pZF0gPSBzdHJlYW07XG4gICAgICAgIHBjLmFkZFN0cmVhbShuZXdTdHJlYW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBjLmdldFNlbmRlcnMoKS5maW5kKGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgcmV0dXJuIHMudHJhY2sgPT09IHRyYWNrO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIHJlcGxhY2UgdGhlIGludGVybmFsIHN0cmVhbSBpZCB3aXRoIHRoZSBleHRlcm5hbCBvbmUgYW5kXG4gICAgLy8gdmljZSB2ZXJzYS5cbiAgICBmdW5jdGlvbiByZXBsYWNlSW50ZXJuYWxTdHJlYW1JZChwYywgZGVzY3JpcHRpb24pIHtcbiAgICAgIHZhciBzZHAgPSBkZXNjcmlwdGlvbi5zZHA7XG4gICAgICBPYmplY3Qua2V5cyhwYy5fcmV2ZXJzZVN0cmVhbXMgfHwgW10pLmZvckVhY2goZnVuY3Rpb24oaW50ZXJuYWxJZCkge1xuICAgICAgICB2YXIgZXh0ZXJuYWxTdHJlYW0gPSBwYy5fcmV2ZXJzZVN0cmVhbXNbaW50ZXJuYWxJZF07XG4gICAgICAgIHZhciBpbnRlcm5hbFN0cmVhbSA9IHBjLl9zdHJlYW1zW2V4dGVybmFsU3RyZWFtLmlkXTtcbiAgICAgICAgc2RwID0gc2RwLnJlcGxhY2UobmV3IFJlZ0V4cChpbnRlcm5hbFN0cmVhbS5pZCwgJ2cnKSxcbiAgICAgICAgICAgIGV4dGVybmFsU3RyZWFtLmlkKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe1xuICAgICAgICB0eXBlOiBkZXNjcmlwdGlvbi50eXBlLFxuICAgICAgICBzZHA6IHNkcFxuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlcGxhY2VFeHRlcm5hbFN0cmVhbUlkKHBjLCBkZXNjcmlwdGlvbikge1xuICAgICAgdmFyIHNkcCA9IGRlc2NyaXB0aW9uLnNkcDtcbiAgICAgIE9iamVjdC5rZXlzKHBjLl9yZXZlcnNlU3RyZWFtcyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihpbnRlcm5hbElkKSB7XG4gICAgICAgIHZhciBleHRlcm5hbFN0cmVhbSA9IHBjLl9yZXZlcnNlU3RyZWFtc1tpbnRlcm5hbElkXTtcbiAgICAgICAgdmFyIGludGVybmFsU3RyZWFtID0gcGMuX3N0cmVhbXNbZXh0ZXJuYWxTdHJlYW0uaWRdO1xuICAgICAgICBzZHAgPSBzZHAucmVwbGFjZShuZXcgUmVnRXhwKGV4dGVybmFsU3RyZWFtLmlkLCAnZycpLFxuICAgICAgICAgICAgaW50ZXJuYWxTdHJlYW0uaWQpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7XG4gICAgICAgIHR5cGU6IGRlc2NyaXB0aW9uLnR5cGUsXG4gICAgICAgIHNkcDogc2RwXG4gICAgICB9KTtcbiAgICB9XG4gICAgWydjcmVhdGVPZmZlcicsICdjcmVhdGVBbnN3ZXInXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgdmFyIG5hdGl2ZU1ldGhvZCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgdmFyIGlzTGVnYWN5Q2FsbCA9IGFyZ3VtZW50cy5sZW5ndGggJiZcbiAgICAgICAgICAgIHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdmdW5jdGlvbic7XG4gICAgICAgIGlmIChpc0xlZ2FjeUNhbGwpIHtcbiAgICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHBjLCBbXG4gICAgICAgICAgICBmdW5jdGlvbihkZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgICB2YXIgZGVzYyA9IHJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkKHBjLCBkZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgIGFyZ3NbMF0uYXBwbHkobnVsbCwgW2Rlc2NdKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3NbMV0pIHtcbiAgICAgICAgICAgICAgICBhcmdzWzFdLmFwcGx5KG51bGwsIGVycik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGFyZ3VtZW50c1syXVxuICAgICAgICAgIF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkocGMsIGFyZ3VtZW50cylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICByZXR1cm4gcmVwbGFjZUludGVybmFsU3RyZWFtSWQocGMsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgdmFyIG9yaWdTZXRMb2NhbERlc2NyaXB0aW9uID1cbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0TG9jYWxEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCB8fCAhYXJndW1lbnRzWzBdLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdTZXRMb2NhbERlc2NyaXB0aW9uLmFwcGx5KHBjLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgYXJndW1lbnRzWzBdID0gcmVwbGFjZUV4dGVybmFsU3RyZWFtSWQocGMsIGFyZ3VtZW50c1swXSk7XG4gICAgICByZXR1cm4gb3JpZ1NldExvY2FsRGVzY3JpcHRpb24uYXBwbHkocGMsIGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIC8vIFRPRE86IG1hbmdsZSBnZXRTdGF0czogaHR0cHM6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1zdGF0cy8jZG9tLXJ0Y21lZGlhc3RyZWFtc3RhdHMtc3RyZWFtaWRlbnRpZmllclxuXG4gICAgdmFyIG9yaWdMb2NhbERlc2NyaXB0aW9uID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihcbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSwgJ2xvY2FsRGVzY3JpcHRpb24nKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSxcbiAgICAgICAgJ2xvY2FsRGVzY3JpcHRpb24nLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBvcmlnTG9jYWxEZXNjcmlwdGlvbi5nZXQuYXBwbHkodGhpcyk7XG4gICAgICAgICAgICBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkKHBjLCBkZXNjcmlwdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlVHJhY2sgPSBmdW5jdGlvbihzZW5kZXIpIHtcbiAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdjbG9zZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oXG4gICAgICAgICAgJ1RoZSBSVENQZWVyQ29ubmVjdGlvblxcJ3Mgc2lnbmFsaW5nU3RhdGUgaXMgXFwnY2xvc2VkXFwnLicsXG4gICAgICAgICAgJ0ludmFsaWRTdGF0ZUVycm9yJyk7XG4gICAgICB9XG4gICAgICAvLyBXZSBjYW4gbm90IHlldCBjaGVjayBmb3Igc2VuZGVyIGluc3RhbmNlb2YgUlRDUnRwU2VuZGVyXG4gICAgICAvLyBzaW5jZSB3ZSBzaGltIFJUUFNlbmRlci4gU28gd2UgY2hlY2sgaWYgc2VuZGVyLl9wYyBpcyBzZXQuXG4gICAgICBpZiAoIXNlbmRlci5fcGMpIHtcbiAgICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignQXJndW1lbnQgMSBvZiBSVENQZWVyQ29ubmVjdGlvbi5yZW1vdmVUcmFjayAnICtcbiAgICAgICAgICAgICdkb2VzIG5vdCBpbXBsZW1lbnQgaW50ZXJmYWNlIFJUQ1J0cFNlbmRlci4nLCAnVHlwZUVycm9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXNMb2NhbCA9IHNlbmRlci5fcGMgPT09IHBjO1xuICAgICAgaWYgKCFpc0xvY2FsKSB7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1NlbmRlciB3YXMgbm90IGNyZWF0ZWQgYnkgdGhpcyBjb25uZWN0aW9uLicsXG4gICAgICAgICAgICAnSW52YWxpZEFjY2Vzc0Vycm9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNlYXJjaCBmb3IgdGhlIG5hdGl2ZSBzdHJlYW0gdGhlIHNlbmRlcnMgdHJhY2sgYmVsb25ncyB0by5cbiAgICAgIHBjLl9zdHJlYW1zID0gcGMuX3N0cmVhbXMgfHwge307XG4gICAgICB2YXIgc3RyZWFtO1xuICAgICAgT2JqZWN0LmtleXMocGMuX3N0cmVhbXMpLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtaWQpIHtcbiAgICAgICAgdmFyIGhhc1RyYWNrID0gcGMuX3N0cmVhbXNbc3RyZWFtaWRdLmdldFRyYWNrcygpLmZpbmQoZnVuY3Rpb24odHJhY2spIHtcbiAgICAgICAgICByZXR1cm4gc2VuZGVyLnRyYWNrID09PSB0cmFjaztcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChoYXNUcmFjaykge1xuICAgICAgICAgIHN0cmVhbSA9IHBjLl9zdHJlYW1zW3N0cmVhbWlkXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgaWYgKHN0cmVhbS5nZXRUcmFja3MoKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAvLyBpZiB0aGlzIGlzIHRoZSBsYXN0IHRyYWNrIG9mIHRoZSBzdHJlYW0sIHJlbW92ZSB0aGUgc3RyZWFtLiBUaGlzXG4gICAgICAgICAgLy8gdGFrZXMgY2FyZSBvZiBhbnkgc2hpbW1lZCBfc2VuZGVycy5cbiAgICAgICAgICBwYy5yZW1vdmVTdHJlYW0ocGMuX3JldmVyc2VTdHJlYW1zW3N0cmVhbS5pZF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHJlbHlpbmcgb24gdGhlIHNhbWUgb2RkIGNocm9tZSBiZWhhdmlvdXIgYXMgYWJvdmUuXG4gICAgICAgICAgc3RyZWFtLnJlbW92ZVRyYWNrKHNlbmRlci50cmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcGMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ25lZ290aWF0aW9ubmVlZGVkJykpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2hpbVBlZXJDb25uZWN0aW9uOiBmdW5jdGlvbih3aW5kb3cpIHtcbiAgICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG5cbiAgICAvLyBUaGUgUlRDUGVlckNvbm5lY3Rpb24gb2JqZWN0LlxuICAgIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmIHdpbmRvdy53ZWJraXRSVENQZWVyQ29ubmVjdGlvbikge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uID0gZnVuY3Rpb24ocGNDb25maWcsIHBjQ29uc3RyYWludHMpIHtcbiAgICAgICAgLy8gVHJhbnNsYXRlIGljZVRyYW5zcG9ydFBvbGljeSB0byBpY2VUcmFuc3BvcnRzLFxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD00ODY5XG4gICAgICAgIC8vIHRoaXMgd2FzIGZpeGVkIGluIE01NiBhbG9uZyB3aXRoIHVucHJlZml4aW5nIFJUQ1BlZXJDb25uZWN0aW9uLlxuICAgICAgICBsb2dnaW5nKCdQZWVyQ29ubmVjdGlvbicpO1xuICAgICAgICBpZiAocGNDb25maWcgJiYgcGNDb25maWcuaWNlVHJhbnNwb3J0UG9saWN5KSB7XG4gICAgICAgICAgcGNDb25maWcuaWNlVHJhbnNwb3J0cyA9IHBjQ29uZmlnLmljZVRyYW5zcG9ydFBvbGljeTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnLCBwY0NvbnN0cmFpbnRzKTtcbiAgICAgIH07XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlID1cbiAgICAgICAgICB3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlO1xuICAgICAgLy8gd3JhcCBzdGF0aWMgbWV0aG9kcy4gQ3VycmVudGx5IGp1c3QgZ2VuZXJhdGVDZXJ0aWZpY2F0ZS5cbiAgICAgIGlmICh3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb24uZ2VuZXJhdGVDZXJ0aWZpY2F0ZSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLCAnZ2VuZXJhdGVDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy53ZWJraXRSVENQZWVyQ29ubmVjdGlvbi5nZW5lcmF0ZUNlcnRpZmljYXRlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG1pZ3JhdGUgZnJvbSBub24tc3BlYyBSVENJY2VTZXJ2ZXIudXJsIHRvIFJUQ0ljZVNlcnZlci51cmxzXG4gICAgICB2YXIgT3JpZ1BlZXJDb25uZWN0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uID0gZnVuY3Rpb24ocGNDb25maWcsIHBjQ29uc3RyYWludHMpIHtcbiAgICAgICAgaWYgKHBjQ29uZmlnICYmIHBjQ29uZmlnLmljZVNlcnZlcnMpIHtcbiAgICAgICAgICB2YXIgbmV3SWNlU2VydmVycyA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGNDb25maWcuaWNlU2VydmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHNlcnZlciA9IHBjQ29uZmlnLmljZVNlcnZlcnNbaV07XG4gICAgICAgICAgICBpZiAoIXNlcnZlci5oYXNPd25Qcm9wZXJ0eSgndXJscycpICYmXG4gICAgICAgICAgICAgICAgc2VydmVyLmhhc093blByb3BlcnR5KCd1cmwnKSkge1xuICAgICAgICAgICAgICB1dGlscy5kZXByZWNhdGVkKCdSVENJY2VTZXJ2ZXIudXJsJywgJ1JUQ0ljZVNlcnZlci51cmxzJyk7XG4gICAgICAgICAgICAgIHNlcnZlciA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2VydmVyKSk7XG4gICAgICAgICAgICAgIHNlcnZlci51cmxzID0gc2VydmVyLnVybDtcbiAgICAgICAgICAgICAgbmV3SWNlU2VydmVycy5wdXNoKHNlcnZlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXdJY2VTZXJ2ZXJzLnB1c2gocGNDb25maWcuaWNlU2VydmVyc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHBjQ29uZmlnLmljZVNlcnZlcnMgPSBuZXdJY2VTZXJ2ZXJzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgT3JpZ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnLCBwY0NvbnN0cmFpbnRzKTtcbiAgICAgIH07XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlID0gT3JpZ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZTtcbiAgICAgIC8vIHdyYXAgc3RhdGljIG1ldGhvZHMuIEN1cnJlbnRseSBqdXN0IGdlbmVyYXRlQ2VydGlmaWNhdGUuXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLCAnZ2VuZXJhdGVDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gT3JpZ1BlZXJDb25uZWN0aW9uLmdlbmVyYXRlQ2VydGlmaWNhdGU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBvcmlnR2V0U3RhdHMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFN0YXRzO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbihzZWxlY3RvcixcbiAgICAgICAgc3VjY2Vzc0NhbGxiYWNrLCBlcnJvckNhbGxiYWNrKSB7XG4gICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgIC8vIElmIHNlbGVjdG9yIGlzIGEgZnVuY3Rpb24gdGhlbiB3ZSBhcmUgaW4gdGhlIG9sZCBzdHlsZSBzdGF0cyBzbyBqdXN0XG4gICAgICAvLyBwYXNzIGJhY2sgdGhlIG9yaWdpbmFsIGdldFN0YXRzIGZvcm1hdCB0byBhdm9pZCBicmVha2luZyBvbGQgdXNlcnMuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIHNlbGVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBvcmlnR2V0U3RhdHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cblxuICAgICAgLy8gV2hlbiBzcGVjLXN0eWxlIGdldFN0YXRzIGlzIHN1cHBvcnRlZCwgcmV0dXJuIHRob3NlIHdoZW4gY2FsbGVkIHdpdGhcbiAgICAgIC8vIGVpdGhlciBubyBhcmd1bWVudHMgb3IgdGhlIHNlbGVjdG9yIGFyZ3VtZW50IGlzIG51bGwuXG4gICAgICBpZiAob3JpZ0dldFN0YXRzLmxlbmd0aCA9PT0gMCAmJiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICAgIHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgIHJldHVybiBvcmlnR2V0U3RhdHMuYXBwbHkodGhpcywgW10pO1xuICAgICAgfVxuXG4gICAgICB2YXIgZml4Q2hyb21lU3RhdHNfID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIHN0YW5kYXJkUmVwb3J0ID0ge307XG4gICAgICAgIHZhciByZXBvcnRzID0gcmVzcG9uc2UucmVzdWx0KCk7XG4gICAgICAgIHJlcG9ydHMuZm9yRWFjaChmdW5jdGlvbihyZXBvcnQpIHtcbiAgICAgICAgICB2YXIgc3RhbmRhcmRTdGF0cyA9IHtcbiAgICAgICAgICAgIGlkOiByZXBvcnQuaWQsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHJlcG9ydC50aW1lc3RhbXAsXG4gICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgIGxvY2FsY2FuZGlkYXRlOiAnbG9jYWwtY2FuZGlkYXRlJyxcbiAgICAgICAgICAgICAgcmVtb3RlY2FuZGlkYXRlOiAncmVtb3RlLWNhbmRpZGF0ZSdcbiAgICAgICAgICAgIH1bcmVwb3J0LnR5cGVdIHx8IHJlcG9ydC50eXBlXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXBvcnQubmFtZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHN0YW5kYXJkU3RhdHNbbmFtZV0gPSByZXBvcnQuc3RhdChuYW1lKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzdGFuZGFyZFJlcG9ydFtzdGFuZGFyZFN0YXRzLmlkXSA9IHN0YW5kYXJkU3RhdHM7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdGFuZGFyZFJlcG9ydDtcbiAgICAgIH07XG5cbiAgICAgIC8vIHNoaW0gZ2V0U3RhdHMgd2l0aCBtYXBsaWtlIHN1cHBvcnRcbiAgICAgIHZhciBtYWtlTWFwU3RhdHMgPSBmdW5jdGlvbihzdGF0cykge1xuICAgICAgICByZXR1cm4gbmV3IE1hcChPYmplY3Qua2V5cyhzdGF0cykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHJldHVybiBba2V5LCBzdGF0c1trZXldXTtcbiAgICAgICAgfSkpO1xuICAgICAgfTtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMikge1xuICAgICAgICB2YXIgc3VjY2Vzc0NhbGxiYWNrV3JhcHBlcl8gPSBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgIGFyZ3NbMV0obWFrZU1hcFN0YXRzKGZpeENocm9tZVN0YXRzXyhyZXNwb25zZSkpKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gb3JpZ0dldFN0YXRzLmFwcGx5KHRoaXMsIFtzdWNjZXNzQ2FsbGJhY2tXcmFwcGVyXyxcbiAgICAgICAgICBhcmd1bWVudHNbMF1dKTtcbiAgICAgIH1cblxuICAgICAgLy8gcHJvbWlzZS1zdXBwb3J0XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIG9yaWdHZXRTdGF0cy5hcHBseShwYywgW1xuICAgICAgICAgIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXNvbHZlKG1ha2VNYXBTdGF0cyhmaXhDaHJvbWVTdGF0c18ocmVzcG9uc2UpKSk7XG4gICAgICAgICAgfSwgcmVqZWN0XSk7XG4gICAgICB9KS50aGVuKHN1Y2Nlc3NDYWxsYmFjaywgZXJyb3JDYWxsYmFjayk7XG4gICAgfTtcblxuICAgIC8vIGFkZCBwcm9taXNlIHN1cHBvcnQgLS0gbmF0aXZlbHkgYXZhaWxhYmxlIGluIENocm9tZSA1MVxuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNTEpIHtcbiAgICAgIFsnc2V0TG9jYWxEZXNjcmlwdGlvbicsICdzZXRSZW1vdGVEZXNjcmlwdGlvbicsICdhZGRJY2VDYW5kaWRhdGUnXVxuICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgICAgICAgdmFyIG5hdGl2ZU1ldGhvZCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICAgICAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgICAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuYXRpdmVNZXRob2QuYXBwbHkocGMsIFthcmdzWzBdLCByZXNvbHZlLCByZWplY3RdKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGFyZ3NbMV0uYXBwbHkobnVsbCwgW10pO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPj0gMykge1xuICAgICAgICAgICAgICAgICAgYXJnc1syXS5hcHBseShudWxsLCBbZXJyXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcHJvbWlzZSBzdXBwb3J0IGZvciBjcmVhdGVPZmZlciBhbmQgY3JlYXRlQW5zd2VyLiBBdmFpbGFibGUgKHdpdGhvdXRcbiAgICAvLyBidWdzKSBzaW5jZSBNNTI6IGNyYnVnLzYxOTI4OVxuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNTIpIHtcbiAgICAgIFsnY3JlYXRlT2ZmZXInLCAnY3JlYXRlQW5zd2VyJ10uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgICAgdmFyIG5hdGl2ZU1ldGhvZCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDEgfHwgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiZcbiAgICAgICAgICAgICAgdHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgICAgICB2YXIgb3B0cyA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBhcmd1bWVudHNbMF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgIG5hdGl2ZU1ldGhvZC5hcHBseShwYywgW3Jlc29sdmUsIHJlamVjdCwgb3B0c10pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNoaW0gaW1wbGljaXQgY3JlYXRpb24gb2YgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uL1JUQ0ljZUNhbmRpZGF0ZVxuICAgIFsnc2V0TG9jYWxEZXNjcmlwdGlvbicsICdzZXRSZW1vdGVEZXNjcmlwdGlvbicsICdhZGRJY2VDYW5kaWRhdGUnXVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgICAgICB2YXIgbmF0aXZlTWV0aG9kID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdO1xuICAgICAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXJndW1lbnRzWzBdID0gbmV3ICgobWV0aG9kID09PSAnYWRkSWNlQ2FuZGlkYXRlJykgP1xuICAgICAgICAgICAgICAgIHdpbmRvdy5SVENJY2VDYW5kaWRhdGUgOlxuICAgICAgICAgICAgICAgIHdpbmRvdy5SVENTZXNzaW9uRGVzY3JpcHRpb24pKGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAvLyBzdXBwb3J0IGZvciBhZGRJY2VDYW5kaWRhdGUobnVsbCBvciB1bmRlZmluZWQpXG4gICAgdmFyIG5hdGl2ZUFkZEljZUNhbmRpZGF0ZSA9XG4gICAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50c1swXSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzWzFdKSB7XG4gICAgICAgICAgYXJndW1lbnRzWzFdLmFwcGx5KG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVBZGRJY2VDYW5kaWRhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG59O1xuXG59LHtcIi4uL3V0aWxzLmpzXCI6MTMsXCIuL2dldHVzZXJtZWRpYVwiOjZ9XSw2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuIC8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciBsb2dnaW5nID0gdXRpbHMubG9nO1xuXG4vLyBFeHBvc2UgcHVibGljIG1ldGhvZHMuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdpbmRvdykge1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG4gIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cgJiYgd2luZG93Lm5hdmlnYXRvcjtcblxuICB2YXIgY29uc3RyYWludHNUb0Nocm9tZV8gPSBmdW5jdGlvbihjKSB7XG4gICAgaWYgKHR5cGVvZiBjICE9PSAnb2JqZWN0JyB8fCBjLm1hbmRhdG9yeSB8fCBjLm9wdGlvbmFsKSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgdmFyIGNjID0ge307XG4gICAgT2JqZWN0LmtleXMoYykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZXF1aXJlJyB8fCBrZXkgPT09ICdhZHZhbmNlZCcgfHwga2V5ID09PSAnbWVkaWFTb3VyY2UnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciByID0gKHR5cGVvZiBjW2tleV0gPT09ICdvYmplY3QnKSA/IGNba2V5XSA6IHtpZGVhbDogY1trZXldfTtcbiAgICAgIGlmIChyLmV4YWN0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIHIuZXhhY3QgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHIubWluID0gci5tYXggPSByLmV4YWN0O1xuICAgICAgfVxuICAgICAgdmFyIG9sZG5hbWVfID0gZnVuY3Rpb24ocHJlZml4LCBuYW1lKSB7XG4gICAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgICByZXR1cm4gcHJlZml4ICsgbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChuYW1lID09PSAnZGV2aWNlSWQnKSA/ICdzb3VyY2VJZCcgOiBuYW1lO1xuICAgICAgfTtcbiAgICAgIGlmIChyLmlkZWFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY2Mub3B0aW9uYWwgPSBjYy5vcHRpb25hbCB8fCBbXTtcbiAgICAgICAgdmFyIG9jID0ge307XG4gICAgICAgIGlmICh0eXBlb2Ygci5pZGVhbCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvY1tvbGRuYW1lXygnbWluJywga2V5KV0gPSByLmlkZWFsO1xuICAgICAgICAgIGNjLm9wdGlvbmFsLnB1c2gob2MpO1xuICAgICAgICAgIG9jID0ge307XG4gICAgICAgICAgb2Nbb2xkbmFtZV8oJ21heCcsIGtleSldID0gci5pZGVhbDtcbiAgICAgICAgICBjYy5vcHRpb25hbC5wdXNoKG9jKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvY1tvbGRuYW1lXygnJywga2V5KV0gPSByLmlkZWFsO1xuICAgICAgICAgIGNjLm9wdGlvbmFsLnB1c2gob2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoci5leGFjdCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiByLmV4YWN0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICBjYy5tYW5kYXRvcnkgPSBjYy5tYW5kYXRvcnkgfHwge307XG4gICAgICAgIGNjLm1hbmRhdG9yeVtvbGRuYW1lXygnJywga2V5KV0gPSByLmV4YWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgWydtaW4nLCAnbWF4J10uZm9yRWFjaChmdW5jdGlvbihtaXgpIHtcbiAgICAgICAgICBpZiAoclttaXhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNjLm1hbmRhdG9yeSA9IGNjLm1hbmRhdG9yeSB8fCB7fTtcbiAgICAgICAgICAgIGNjLm1hbmRhdG9yeVtvbGRuYW1lXyhtaXgsIGtleSldID0gclttaXhdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGMuYWR2YW5jZWQpIHtcbiAgICAgIGNjLm9wdGlvbmFsID0gKGNjLm9wdGlvbmFsIHx8IFtdKS5jb25jYXQoYy5hZHZhbmNlZCk7XG4gICAgfVxuICAgIHJldHVybiBjYztcbiAgfTtcblxuICB2YXIgc2hpbUNvbnN0cmFpbnRzXyA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBmdW5jKSB7XG4gICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPj0gNjEpIHtcbiAgICAgIHJldHVybiBmdW5jKGNvbnN0cmFpbnRzKTtcbiAgICB9XG4gICAgY29uc3RyYWludHMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzKSk7XG4gICAgaWYgKGNvbnN0cmFpbnRzICYmIHR5cGVvZiBjb25zdHJhaW50cy5hdWRpbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciByZW1hcCA9IGZ1bmN0aW9uKG9iaiwgYSwgYikge1xuICAgICAgICBpZiAoYSBpbiBvYmogJiYgIShiIGluIG9iaikpIHtcbiAgICAgICAgICBvYmpbYl0gPSBvYmpbYV07XG4gICAgICAgICAgZGVsZXRlIG9ialthXTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0cmFpbnRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuICAgICAgcmVtYXAoY29uc3RyYWludHMuYXVkaW8sICdhdXRvR2FpbkNvbnRyb2wnLCAnZ29vZ0F1dG9HYWluQ29udHJvbCcpO1xuICAgICAgcmVtYXAoY29uc3RyYWludHMuYXVkaW8sICdub2lzZVN1cHByZXNzaW9uJywgJ2dvb2dOb2lzZVN1cHByZXNzaW9uJyk7XG4gICAgICBjb25zdHJhaW50cy5hdWRpbyA9IGNvbnN0cmFpbnRzVG9DaHJvbWVfKGNvbnN0cmFpbnRzLmF1ZGlvKTtcbiAgICB9XG4gICAgaWYgKGNvbnN0cmFpbnRzICYmIHR5cGVvZiBjb25zdHJhaW50cy52aWRlbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIFNoaW0gZmFjaW5nTW9kZSBmb3IgbW9iaWxlICYgc3VyZmFjZSBwcm8uXG4gICAgICB2YXIgZmFjZSA9IGNvbnN0cmFpbnRzLnZpZGVvLmZhY2luZ01vZGU7XG4gICAgICBmYWNlID0gZmFjZSAmJiAoKHR5cGVvZiBmYWNlID09PSAnb2JqZWN0JykgPyBmYWNlIDoge2lkZWFsOiBmYWNlfSk7XG4gICAgICB2YXIgZ2V0U3VwcG9ydGVkRmFjaW5nTW9kZUxpZXMgPSBicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNjY7XG5cbiAgICAgIGlmICgoZmFjZSAmJiAoZmFjZS5leGFjdCA9PT0gJ3VzZXInIHx8IGZhY2UuZXhhY3QgPT09ICdlbnZpcm9ubWVudCcgfHxcbiAgICAgICAgICAgICAgICAgICAgZmFjZS5pZGVhbCA9PT0gJ3VzZXInIHx8IGZhY2UuaWRlYWwgPT09ICdlbnZpcm9ubWVudCcpKSAmJlxuICAgICAgICAgICEobmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRTdXBwb3J0ZWRDb25zdHJhaW50cyAmJlxuICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRTdXBwb3J0ZWRDb25zdHJhaW50cygpLmZhY2luZ01vZGUgJiZcbiAgICAgICAgICAgICFnZXRTdXBwb3J0ZWRGYWNpbmdNb2RlTGllcykpIHtcbiAgICAgICAgZGVsZXRlIGNvbnN0cmFpbnRzLnZpZGVvLmZhY2luZ01vZGU7XG4gICAgICAgIHZhciBtYXRjaGVzO1xuICAgICAgICBpZiAoZmFjZS5leGFjdCA9PT0gJ2Vudmlyb25tZW50JyB8fCBmYWNlLmlkZWFsID09PSAnZW52aXJvbm1lbnQnKSB7XG4gICAgICAgICAgbWF0Y2hlcyA9IFsnYmFjaycsICdyZWFyJ107XG4gICAgICAgIH0gZWxzZSBpZiAoZmFjZS5leGFjdCA9PT0gJ3VzZXInIHx8IGZhY2UuaWRlYWwgPT09ICd1c2VyJykge1xuICAgICAgICAgIG1hdGNoZXMgPSBbJ2Zyb250J107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgICAvLyBMb29rIGZvciBtYXRjaGVzIGluIGxhYmVsLCBvciB1c2UgbGFzdCBjYW0gZm9yIGJhY2sgKHR5cGljYWwpLlxuICAgICAgICAgIHJldHVybiBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRldmljZXMpIHtcbiAgICAgICAgICAgIGRldmljZXMgPSBkZXZpY2VzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLmtpbmQgPT09ICd2aWRlb2lucHV0JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGRldiA9IGRldmljZXMuZmluZChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBtYXRjaGVzLnNvbWUoZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5sYWJlbC50b0xvd2VyQ2FzZSgpLmluZGV4T2YobWF0Y2gpICE9PSAtMTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghZGV2ICYmIGRldmljZXMubGVuZ3RoICYmIG1hdGNoZXMuaW5kZXhPZignYmFjaycpICE9PSAtMSkge1xuICAgICAgICAgICAgICBkZXYgPSBkZXZpY2VzW2RldmljZXMubGVuZ3RoIC0gMV07IC8vIG1vcmUgbGlrZWx5IHRoZSBiYWNrIGNhbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRldikge1xuICAgICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5kZXZpY2VJZCA9IGZhY2UuZXhhY3QgPyB7ZXhhY3Q6IGRldi5kZXZpY2VJZH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aWRlYWw6IGRldi5kZXZpY2VJZH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlbyA9IGNvbnN0cmFpbnRzVG9DaHJvbWVfKGNvbnN0cmFpbnRzLnZpZGVvKTtcbiAgICAgICAgICAgIGxvZ2dpbmcoJ2Nocm9tZTogJyArIEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzKSk7XG4gICAgICAgICAgICByZXR1cm4gZnVuYyhjb25zdHJhaW50cyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0gY29uc3RyYWludHNUb0Nocm9tZV8oY29uc3RyYWludHMudmlkZW8pO1xuICAgIH1cbiAgICBsb2dnaW5nKCdjaHJvbWU6ICcgKyBKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuICAgIHJldHVybiBmdW5jKGNvbnN0cmFpbnRzKTtcbiAgfTtcblxuICB2YXIgc2hpbUVycm9yXyA9IGZ1bmN0aW9uKGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZToge1xuICAgICAgICBQZXJtaXNzaW9uRGVuaWVkRXJyb3I6ICdOb3RBbGxvd2VkRXJyb3InLFxuICAgICAgICBQZXJtaXNzaW9uRGlzbWlzc2VkRXJyb3I6ICdOb3RBbGxvd2VkRXJyb3InLFxuICAgICAgICBJbnZhbGlkU3RhdGVFcnJvcjogJ05vdEFsbG93ZWRFcnJvcicsXG4gICAgICAgIERldmljZXNOb3RGb3VuZEVycm9yOiAnTm90Rm91bmRFcnJvcicsXG4gICAgICAgIENvbnN0cmFpbnROb3RTYXRpc2ZpZWRFcnJvcjogJ092ZXJjb25zdHJhaW5lZEVycm9yJyxcbiAgICAgICAgVHJhY2tTdGFydEVycm9yOiAnTm90UmVhZGFibGVFcnJvcicsXG4gICAgICAgIE1lZGlhRGV2aWNlRmFpbGVkRHVlVG9TaHV0ZG93bjogJ05vdEFsbG93ZWRFcnJvcicsXG4gICAgICAgIE1lZGlhRGV2aWNlS2lsbFN3aXRjaE9uOiAnTm90QWxsb3dlZEVycm9yJyxcbiAgICAgICAgVGFiQ2FwdHVyZUVycm9yOiAnQWJvcnRFcnJvcicsXG4gICAgICAgIFNjcmVlbkNhcHR1cmVFcnJvcjogJ0Fib3J0RXJyb3InLFxuICAgICAgICBEZXZpY2VDYXB0dXJlRXJyb3I6ICdBYm9ydEVycm9yJ1xuICAgICAgfVtlLm5hbWVdIHx8IGUubmFtZSxcbiAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZSxcbiAgICAgIGNvbnN0cmFpbnQ6IGUuY29uc3RyYWludE5hbWUsXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWUgKyAodGhpcy5tZXNzYWdlICYmICc6ICcpICsgdGhpcy5tZXNzYWdlO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgdmFyIGdldFVzZXJNZWRpYV8gPSBmdW5jdGlvbihjb25zdHJhaW50cywgb25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgc2hpbUNvbnN0cmFpbnRzXyhjb25zdHJhaW50cywgZnVuY3Rpb24oYykge1xuICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYShjLCBvblN1Y2Nlc3MsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKG9uRXJyb3IpIHtcbiAgICAgICAgICBvbkVycm9yKHNoaW1FcnJvcl8oZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gZ2V0VXNlck1lZGlhXztcblxuICAvLyBSZXR1cm5zIHRoZSByZXN1bHQgb2YgZ2V0VXNlck1lZGlhIGFzIGEgUHJvbWlzZS5cbiAgdmFyIGdldFVzZXJNZWRpYVByb21pc2VfID0gZnVuY3Rpb24oY29uc3RyYWludHMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCByZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuICB9O1xuXG4gIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMgPSB7XG4gICAgICBnZXRVc2VyTWVkaWE6IGdldFVzZXJNZWRpYVByb21pc2VfLFxuICAgICAgZW51bWVyYXRlRGV2aWNlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgICAgdmFyIGtpbmRzID0ge2F1ZGlvOiAnYXVkaW9pbnB1dCcsIHZpZGVvOiAndmlkZW9pbnB1dCd9O1xuICAgICAgICAgIHJldHVybiB3aW5kb3cuTWVkaWFTdHJlYW1UcmFjay5nZXRTb3VyY2VzKGZ1bmN0aW9uKGRldmljZXMpIHtcbiAgICAgICAgICAgIHJlc29sdmUoZGV2aWNlcy5tYXAoZnVuY3Rpb24oZGV2aWNlKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7bGFiZWw6IGRldmljZS5sYWJlbCxcbiAgICAgICAgICAgICAgICBraW5kOiBraW5kc1tkZXZpY2Uua2luZF0sXG4gICAgICAgICAgICAgICAgZGV2aWNlSWQ6IGRldmljZS5pZCxcbiAgICAgICAgICAgICAgICBncm91cElkOiAnJ307XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIGdldFN1cHBvcnRlZENvbnN0cmFpbnRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkZXZpY2VJZDogdHJ1ZSwgZWNob0NhbmNlbGxhdGlvbjogdHJ1ZSwgZmFjaW5nTW9kZTogdHJ1ZSxcbiAgICAgICAgICBmcmFtZVJhdGU6IHRydWUsIGhlaWdodDogdHJ1ZSwgd2lkdGg6IHRydWVcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLy8gQSBzaGltIGZvciBnZXRVc2VyTWVkaWEgbWV0aG9kIG9uIHRoZSBtZWRpYURldmljZXMgb2JqZWN0LlxuICAvLyBUT0RPKEthcHRlbkphbnNzb24pIHJlbW92ZSBvbmNlIGltcGxlbWVudGVkIGluIENocm9tZSBzdGFibGUuXG4gIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEpIHtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzKSB7XG4gICAgICByZXR1cm4gZ2V0VXNlck1lZGlhUHJvbWlzZV8oY29uc3RyYWludHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gRXZlbiB0aG91Z2ggQ2hyb21lIDQ1IGhhcyBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzIGFuZCBhIGdldFVzZXJNZWRpYVxuICAgIC8vIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBQcm9taXNlLCBpdCBkb2VzIG5vdCBhY2NlcHQgc3BlYy1zdHlsZVxuICAgIC8vIGNvbnN0cmFpbnRzLlxuICAgIHZhciBvcmlnR2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEuXG4gICAgICAgIGJpbmQobmF2aWdhdG9yLm1lZGlhRGV2aWNlcyk7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEgPSBmdW5jdGlvbihjcykge1xuICAgICAgcmV0dXJuIHNoaW1Db25zdHJhaW50c18oY3MsIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdHZXRVc2VyTWVkaWEoYykudGhlbihmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgICBpZiAoYy5hdWRpbyAmJiAhc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoIHx8XG4gICAgICAgICAgICAgIGMudmlkZW8gJiYgIXN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCkge1xuICAgICAgICAgICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcbiAgICAgICAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCcnLCAnTm90Rm91bmRFcnJvcicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc3RyZWFtO1xuICAgICAgICB9LCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHNoaW1FcnJvcl8oZSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICAvLyBEdW1teSBkZXZpY2VjaGFuZ2UgZXZlbnQgbWV0aG9kcy5cbiAgLy8gVE9ETyhLYXB0ZW5KYW5zc29uKSByZW1vdmUgb25jZSBpbXBsZW1lbnRlZCBpbiBDaHJvbWUgc3RhYmxlLlxuICBpZiAodHlwZW9mIG5hdmlnYXRvci5tZWRpYURldmljZXMuYWRkRXZlbnRMaXN0ZW5lciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIGxvZ2dpbmcoJ0R1bW15IG1lZGlhRGV2aWNlcy5hZGRFdmVudExpc3RlbmVyIGNhbGxlZC4nKTtcbiAgICB9O1xuICB9XG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5yZW1vdmVFdmVudExpc3RlbmVyID09PSAndW5kZWZpbmVkJykge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9nZ2luZygnRHVtbXkgbWVkaWFEZXZpY2VzLnJlbW92ZUV2ZW50TGlzdGVuZXIgY2FsbGVkLicpO1xuICAgIH07XG4gIH1cbn07XG5cbn0se1wiLi4vdXRpbHMuanNcIjoxM31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4gLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBTRFBVdGlscyA9IHJlcXVpcmUoJ3NkcCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc2hpbVJUQ0ljZUNhbmRpZGF0ZTogZnVuY3Rpb24od2luZG93KSB7XG4gICAgLy8gZm91bmRhdGlvbiBpcyBhcmJpdHJhcmlseSBjaG9zZW4gYXMgYW4gaW5kaWNhdG9yIGZvciBmdWxsIHN1cHBvcnQgZm9yXG4gICAgLy8gaHR0cHM6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jcnRjaWNlY2FuZGlkYXRlLWludGVyZmFjZVxuICAgIGlmICghd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSB8fCAod2luZG93LlJUQ0ljZUNhbmRpZGF0ZSAmJiAnZm91bmRhdGlvbicgaW5cbiAgICAgICAgd2luZG93LlJUQ0ljZUNhbmRpZGF0ZS5wcm90b3R5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIE5hdGl2ZVJUQ0ljZUNhbmRpZGF0ZSA9IHdpbmRvdy5SVENJY2VDYW5kaWRhdGU7XG4gICAgd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgYT0gd2hpY2ggc2hvdWxkbid0IGJlIHBhcnQgb2YgdGhlIGNhbmRpZGF0ZSBzdHJpbmcuXG4gICAgICBpZiAodHlwZW9mIGFyZ3MgPT09ICdvYmplY3QnICYmIGFyZ3MuY2FuZGlkYXRlICYmXG4gICAgICAgICAgYXJncy5jYW5kaWRhdGUuaW5kZXhPZignYT0nKSA9PT0gMCkge1xuICAgICAgICBhcmdzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShhcmdzKSk7XG4gICAgICAgIGFyZ3MuY2FuZGlkYXRlID0gYXJncy5jYW5kaWRhdGUuc3Vic3RyKDIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXJncy5jYW5kaWRhdGUgJiYgYXJncy5jYW5kaWRhdGUubGVuZ3RoKSB7XG4gICAgICAgIC8vIEF1Z21lbnQgdGhlIG5hdGl2ZSBjYW5kaWRhdGUgd2l0aCB0aGUgcGFyc2VkIGZpZWxkcy5cbiAgICAgICAgdmFyIG5hdGl2ZUNhbmRpZGF0ZSA9IG5ldyBOYXRpdmVSVENJY2VDYW5kaWRhdGUoYXJncyk7XG4gICAgICAgIHZhciBwYXJzZWRDYW5kaWRhdGUgPSBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShhcmdzLmNhbmRpZGF0ZSk7XG4gICAgICAgIHZhciBhdWdtZW50ZWRDYW5kaWRhdGUgPSBPYmplY3QuYXNzaWduKG5hdGl2ZUNhbmRpZGF0ZSxcbiAgICAgICAgICAgIHBhcnNlZENhbmRpZGF0ZSk7XG5cbiAgICAgICAgLy8gQWRkIGEgc2VyaWFsaXplciB0aGF0IGRvZXMgbm90IHNlcmlhbGl6ZSB0aGUgZXh0cmEgYXR0cmlidXRlcy5cbiAgICAgICAgYXVnbWVudGVkQ2FuZGlkYXRlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjYW5kaWRhdGU6IGF1Z21lbnRlZENhbmRpZGF0ZS5jYW5kaWRhdGUsXG4gICAgICAgICAgICBzZHBNaWQ6IGF1Z21lbnRlZENhbmRpZGF0ZS5zZHBNaWQsXG4gICAgICAgICAgICBzZHBNTGluZUluZGV4OiBhdWdtZW50ZWRDYW5kaWRhdGUuc2RwTUxpbmVJbmRleCxcbiAgICAgICAgICAgIHVzZXJuYW1lRnJhZ21lbnQ6IGF1Z21lbnRlZENhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50LFxuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBhdWdtZW50ZWRDYW5kaWRhdGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IE5hdGl2ZVJUQ0ljZUNhbmRpZGF0ZShhcmdzKTtcbiAgICB9O1xuICAgIHdpbmRvdy5SVENJY2VDYW5kaWRhdGUucHJvdG90eXBlID0gTmF0aXZlUlRDSWNlQ2FuZGlkYXRlLnByb3RvdHlwZTtcblxuICAgIC8vIEhvb2sgdXAgdGhlIGF1Z21lbnRlZCBjYW5kaWRhdGUgaW4gb25pY2VjYW5kaWRhdGUgYW5kXG4gICAgLy8gYWRkRXZlbnRMaXN0ZW5lcignaWNlY2FuZGlkYXRlJywgLi4uKVxuICAgIHV0aWxzLndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgJ2ljZWNhbmRpZGF0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChlLmNhbmRpZGF0ZSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgJ2NhbmRpZGF0ZScsIHtcbiAgICAgICAgICB2YWx1ZTogbmV3IHdpbmRvdy5SVENJY2VDYW5kaWRhdGUoZS5jYW5kaWRhdGUpLFxuICAgICAgICAgIHdyaXRhYmxlOiAnZmFsc2UnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gc2hpbUNyZWF0ZU9iamVjdFVSTCBtdXN0IGJlIGNhbGxlZCBiZWZvcmUgc2hpbVNvdXJjZU9iamVjdCB0byBhdm9pZCBsb29wLlxuXG4gIHNoaW1DcmVhdGVPYmplY3RVUkw6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIHZhciBVUkwgPSB3aW5kb3cgJiYgd2luZG93LlVSTDtcblxuICAgIGlmICghKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmIHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50ICYmXG4gICAgICAgICAgJ3NyY09iamVjdCcgaW4gd2luZG93LkhUTUxNZWRpYUVsZW1lbnQucHJvdG90eXBlICYmXG4gICAgICAgIFVSTC5jcmVhdGVPYmplY3RVUkwgJiYgVVJMLnJldm9rZU9iamVjdFVSTCkpIHtcbiAgICAgIC8vIE9ubHkgc2hpbSBDcmVhdGVPYmplY3RVUkwgdXNpbmcgc3JjT2JqZWN0IGlmIHNyY09iamVjdCBleGlzdHMuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHZhciBuYXRpdmVDcmVhdGVPYmplY3RVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMLmJpbmQoVVJMKTtcbiAgICB2YXIgbmF0aXZlUmV2b2tlT2JqZWN0VVJMID0gVVJMLnJldm9rZU9iamVjdFVSTC5iaW5kKFVSTCk7XG4gICAgdmFyIHN0cmVhbXMgPSBuZXcgTWFwKCksIG5ld0lkID0gMDtcblxuICAgIFVSTC5jcmVhdGVPYmplY3RVUkwgPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIGlmICgnZ2V0VHJhY2tzJyBpbiBzdHJlYW0pIHtcbiAgICAgICAgdmFyIHVybCA9ICdwb2x5YmxvYjonICsgKCsrbmV3SWQpO1xuICAgICAgICBzdHJlYW1zLnNldCh1cmwsIHN0cmVhbSk7XG4gICAgICAgIHV0aWxzLmRlcHJlY2F0ZWQoJ1VSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKScsXG4gICAgICAgICAgICAnZWxlbS5zcmNPYmplY3QgPSBzdHJlYW0nKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVDcmVhdGVPYmplY3RVUkwoc3RyZWFtKTtcbiAgICB9O1xuICAgIFVSTC5yZXZva2VPYmplY3RVUkwgPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgIG5hdGl2ZVJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgc3RyZWFtcy5kZWxldGUodXJsKTtcbiAgICB9O1xuXG4gICAgdmFyIGRzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LkhUTUxNZWRpYUVsZW1lbnQucHJvdG90eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzcmMnKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LkhUTUxNZWRpYUVsZW1lbnQucHJvdG90eXBlLCAnc3JjJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRzYy5nZXQuYXBwbHkodGhpcyk7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdGhpcy5zcmNPYmplY3QgPSBzdHJlYW1zLmdldCh1cmwpIHx8IG51bGw7XG4gICAgICAgIHJldHVybiBkc2Muc2V0LmFwcGx5KHRoaXMsIFt1cmxdKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBuYXRpdmVTZXRBdHRyaWJ1dGUgPSB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudC5wcm90b3R5cGUuc2V0QXR0cmlidXRlO1xuICAgIHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50LnByb3RvdHlwZS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyICYmXG4gICAgICAgICAgKCcnICsgYXJndW1lbnRzWzBdKS50b0xvd2VyQ2FzZSgpID09PSAnc3JjJykge1xuICAgICAgICB0aGlzLnNyY09iamVjdCA9IHN0cmVhbXMuZ2V0KGFyZ3VtZW50c1sxXSkgfHwgbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVTZXRBdHRyaWJ1dGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9LFxuXG4gIHNoaW1NYXhNZXNzYWdlU2l6ZTogZnVuY3Rpb24od2luZG93KSB7XG4gICAgaWYgKHdpbmRvdy5SVENTY3RwVHJhbnNwb3J0IHx8ICF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gICAgaWYgKCEoJ3NjdHAnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSwgJ3NjdHAnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9zY3RwID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiB0aGlzLl9zY3RwO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgc2N0cEluRGVzY3JpcHRpb24gPSBmdW5jdGlvbihkZXNjcmlwdGlvbikge1xuICAgICAgdmFyIHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhkZXNjcmlwdGlvbi5zZHApO1xuICAgICAgc2VjdGlvbnMuc2hpZnQoKTtcbiAgICAgIHJldHVybiBzZWN0aW9ucy5zb21lKGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICAgICAgICB2YXIgbUxpbmUgPSBTRFBVdGlscy5wYXJzZU1MaW5lKG1lZGlhU2VjdGlvbik7XG4gICAgICAgIHJldHVybiBtTGluZSAmJiBtTGluZS5raW5kID09PSAnYXBwbGljYXRpb24nXG4gICAgICAgICAgICAmJiBtTGluZS5wcm90b2NvbC5pbmRleE9mKCdTQ1RQJykgIT09IC0xO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBnZXRSZW1vdGVGaXJlZm94VmVyc2lvbiA9IGZ1bmN0aW9uKGRlc2NyaXB0aW9uKSB7XG4gICAgICAvLyBUT0RPOiBJcyB0aGVyZSBhIGJldHRlciBzb2x1dGlvbiBmb3IgZGV0ZWN0aW5nIEZpcmVmb3g/XG4gICAgICB2YXIgbWF0Y2ggPSBkZXNjcmlwdGlvbi5zZHAubWF0Y2goL21vemlsbGEuLi5USElTX0lTX1NEUEFSVEEtKFxcZCspLyk7XG4gICAgICBpZiAobWF0Y2ggPT09IG51bGwgfHwgbWF0Y2gubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICB2YXIgdmVyc2lvbiA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XG4gICAgICAvLyBUZXN0IGZvciBOYU4gKHllcywgdGhpcyBpcyB1Z2x5KVxuICAgICAgcmV0dXJuIHZlcnNpb24gIT09IHZlcnNpb24gPyAtMSA6IHZlcnNpb247XG4gICAgfTtcblxuICAgIHZhciBnZXRDYW5TZW5kTWF4TWVzc2FnZVNpemUgPSBmdW5jdGlvbihyZW1vdGVJc0ZpcmVmb3gpIHtcbiAgICAgIC8vIEV2ZXJ5IGltcGxlbWVudGF0aW9uIHdlIGtub3cgY2FuIHNlbmQgYXQgbGVhc3QgNjQgS2lCLlxuICAgICAgLy8gTm90ZTogQWx0aG91Z2ggQ2hyb21lIGlzIHRlY2huaWNhbGx5IGFibGUgdG8gc2VuZCB1cCB0byAyNTYgS2lCLCB0aGVcbiAgICAgIC8vICAgICAgIGRhdGEgZG9lcyBub3QgcmVhY2ggdGhlIG90aGVyIHBlZXIgcmVsaWFibHkuXG4gICAgICAvLyAgICAgICBTZWU6IGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD04NDE5XG4gICAgICB2YXIgY2FuU2VuZE1heE1lc3NhZ2VTaXplID0gNjU1MzY7XG4gICAgICBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ2ZpcmVmb3gnKSB7XG4gICAgICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNTcpIHtcbiAgICAgICAgICBpZiAocmVtb3RlSXNGaXJlZm94ID09PSAtMSkge1xuICAgICAgICAgICAgLy8gRkYgPCA1NyB3aWxsIHNlbmQgaW4gMTYgS2lCIGNodW5rcyB1c2luZyB0aGUgZGVwcmVjYXRlZCBQUElEXG4gICAgICAgICAgICAvLyBmcmFnbWVudGF0aW9uLlxuICAgICAgICAgICAgY2FuU2VuZE1heE1lc3NhZ2VTaXplID0gMTYzODQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIG90aGVyIEZGIChhbmQgUkFXUlRDKSBjYW4gcmVhc3NlbWJsZSBQUElELWZyYWdtZW50ZWRcbiAgICAgICAgICAgIC8vIG1lc3NhZ2VzLiBUaHVzLCBzdXBwb3J0aW5nIH4yIEdpQiB3aGVuIHNlbmRpbmcuXG4gICAgICAgICAgICBjYW5TZW5kTWF4TWVzc2FnZVNpemUgPSAyMTQ3NDgzNjM3O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBDdXJyZW50bHksIGFsbCBGRiA+PSA1NyB3aWxsIHJlc2V0IHRoZSByZW1vdGUgbWF4aW11bSBtZXNzYWdlIHNpemVcbiAgICAgICAgICAvLyB0byB0aGUgZGVmYXVsdCB2YWx1ZSB3aGVuIGEgZGF0YSBjaGFubmVsIGlzIGNyZWF0ZWQgYXQgYSBsYXRlclxuICAgICAgICAgIC8vIHN0YWdlLiA6KFxuICAgICAgICAgIC8vIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNjgzMVxuICAgICAgICAgIGNhblNlbmRNYXhNZXNzYWdlU2l6ZSA9XG4gICAgICAgICAgICBicm93c2VyRGV0YWlscy52ZXJzaW9uID09PSA1NyA/IDY1NTM1IDogNjU1MzY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBjYW5TZW5kTWF4TWVzc2FnZVNpemU7XG4gICAgfTtcblxuICAgIHZhciBnZXRNYXhNZXNzYWdlU2l6ZSA9IGZ1bmN0aW9uKGRlc2NyaXB0aW9uLCByZW1vdGVJc0ZpcmVmb3gpIHtcbiAgICAgIC8vIE5vdGU6IDY1NTM2IGJ5dGVzIGlzIHRoZSBkZWZhdWx0IHZhbHVlIGZyb20gdGhlIFNEUCBzcGVjLiBBbHNvLFxuICAgICAgLy8gICAgICAgZXZlcnkgaW1wbGVtZW50YXRpb24gd2Uga25vdyBzdXBwb3J0cyByZWNlaXZpbmcgNjU1MzYgYnl0ZXMuXG4gICAgICB2YXIgbWF4TWVzc2FnZVNpemUgPSA2NTUzNjtcblxuICAgICAgLy8gRkYgNTcgaGFzIGEgc2xpZ2h0bHkgaW5jb3JyZWN0IGRlZmF1bHQgcmVtb3RlIG1heCBtZXNzYWdlIHNpemUsIHNvXG4gICAgICAvLyB3ZSBuZWVkIHRvIGFkanVzdCBpdCBoZXJlIHRvIGF2b2lkIGEgZmFpbHVyZSB3aGVuIHNlbmRpbmcuXG4gICAgICAvLyBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTE0MjU2OTdcbiAgICAgIGlmIChicm93c2VyRGV0YWlscy5icm93c2VyID09PSAnZmlyZWZveCdcbiAgICAgICAgICAgJiYgYnJvd3NlckRldGFpbHMudmVyc2lvbiA9PT0gNTcpIHtcbiAgICAgICAgbWF4TWVzc2FnZVNpemUgPSA2NTUzNTtcbiAgICAgIH1cblxuICAgICAgdmFyIG1hdGNoID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoZGVzY3JpcHRpb24uc2RwLCAnYT1tYXgtbWVzc2FnZS1zaXplOicpO1xuICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbWF4TWVzc2FnZVNpemUgPSBwYXJzZUludChtYXRjaFswXS5zdWJzdHIoMTkpLCAxMCk7XG4gICAgICB9IGVsc2UgaWYgKGJyb3dzZXJEZXRhaWxzLmJyb3dzZXIgPT09ICdmaXJlZm94JyAmJlxuICAgICAgICAgICAgICAgICAgcmVtb3RlSXNGaXJlZm94ICE9PSAtMSkge1xuICAgICAgICAvLyBJZiB0aGUgbWF4aW11bSBtZXNzYWdlIHNpemUgaXMgbm90IHByZXNlbnQgaW4gdGhlIHJlbW90ZSBTRFAgYW5kXG4gICAgICAgIC8vIGJvdGggbG9jYWwgYW5kIHJlbW90ZSBhcmUgRmlyZWZveCwgdGhlIHJlbW90ZSBwZWVyIGNhbiByZWNlaXZlXG4gICAgICAgIC8vIH4yIEdpQi5cbiAgICAgICAgbWF4TWVzc2FnZVNpemUgPSAyMTQ3NDgzNjM3O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1heE1lc3NhZ2VTaXplO1xuICAgIH07XG5cbiAgICB2YXIgb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uID1cbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbjtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgcGMuX3NjdHAgPSBudWxsO1xuXG4gICAgICBpZiAoc2N0cEluRGVzY3JpcHRpb24oYXJndW1lbnRzWzBdKSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVtb3RlIGlzIEZGLlxuICAgICAgICB2YXIgaXNGaXJlZm94ID0gZ2V0UmVtb3RlRmlyZWZveFZlcnNpb24oYXJndW1lbnRzWzBdKTtcblxuICAgICAgICAvLyBHZXQgdGhlIG1heGltdW0gbWVzc2FnZSBzaXplIHRoZSBsb2NhbCBwZWVyIGlzIGNhcGFibGUgb2Ygc2VuZGluZ1xuICAgICAgICB2YXIgY2FuU2VuZE1NUyA9IGdldENhblNlbmRNYXhNZXNzYWdlU2l6ZShpc0ZpcmVmb3gpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgbWF4aW11bSBtZXNzYWdlIHNpemUgb2YgdGhlIHJlbW90ZSBwZWVyLlxuICAgICAgICB2YXIgcmVtb3RlTU1TID0gZ2V0TWF4TWVzc2FnZVNpemUoYXJndW1lbnRzWzBdLCBpc0ZpcmVmb3gpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBmaW5hbCBtYXhpbXVtIG1lc3NhZ2Ugc2l6ZVxuICAgICAgICB2YXIgbWF4TWVzc2FnZVNpemU7XG4gICAgICAgIGlmIChjYW5TZW5kTU1TID09PSAwICYmIHJlbW90ZU1NUyA9PT0gMCkge1xuICAgICAgICAgIG1heE1lc3NhZ2VTaXplID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgICAgICB9IGVsc2UgaWYgKGNhblNlbmRNTVMgPT09IDAgfHwgcmVtb3RlTU1TID09PSAwKSB7XG4gICAgICAgICAgbWF4TWVzc2FnZVNpemUgPSBNYXRoLm1heChjYW5TZW5kTU1TLCByZW1vdGVNTVMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1heE1lc3NhZ2VTaXplID0gTWF0aC5taW4oY2FuU2VuZE1NUywgcmVtb3RlTU1TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBhIGR1bW15IFJUQ1NjdHBUcmFuc3BvcnQgb2JqZWN0IGFuZCB0aGUgJ21heE1lc3NhZ2VTaXplJ1xuICAgICAgICAvLyBhdHRyaWJ1dGUuXG4gICAgICAgIHZhciBzY3RwID0ge307XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzY3RwLCAnbWF4TWVzc2FnZVNpemUnLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXhNZXNzYWdlU2l6ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBwYy5fc2N0cCA9IHNjdHA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvcmlnU2V0UmVtb3RlRGVzY3JpcHRpb24uYXBwbHkocGMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSxcblxuICBzaGltU2VuZFRocm93VHlwZUVycm9yOiBmdW5jdGlvbih3aW5kb3cpIHtcbiAgICBpZiAoISh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiZcbiAgICAgICAgJ2NyZWF0ZURhdGFDaGFubmVsJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE5vdGU6IEFsdGhvdWdoIEZpcmVmb3ggPj0gNTcgaGFzIGEgbmF0aXZlIGltcGxlbWVudGF0aW9uLCB0aGUgbWF4aW11bVxuICAgIC8vICAgICAgIG1lc3NhZ2Ugc2l6ZSBjYW4gYmUgcmVzZXQgZm9yIGFsbCBkYXRhIGNoYW5uZWxzIGF0IGEgbGF0ZXIgc3RhZ2UuXG4gICAgLy8gICAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDI2ODMxXG5cbiAgICB2YXIgb3JpZ0NyZWF0ZURhdGFDaGFubmVsID1cbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlRGF0YUNoYW5uZWw7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgIHZhciBkYXRhQ2hhbm5lbCA9IG9yaWdDcmVhdGVEYXRhQ2hhbm5lbC5hcHBseShwYywgYXJndW1lbnRzKTtcbiAgICAgIHZhciBvcmlnRGF0YUNoYW5uZWxTZW5kID0gZGF0YUNoYW5uZWwuc2VuZDtcblxuICAgICAgLy8gUGF0Y2ggJ3NlbmQnIG1ldGhvZFxuICAgICAgZGF0YUNoYW5uZWwuc2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZGMgPSB0aGlzO1xuICAgICAgICB2YXIgZGF0YSA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIGxlbmd0aCA9IGRhdGEubGVuZ3RoIHx8IGRhdGEuc2l6ZSB8fCBkYXRhLmJ5dGVMZW5ndGg7XG4gICAgICAgIGlmIChsZW5ndGggPiBwYy5zY3RwLm1heE1lc3NhZ2VTaXplKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignTWVzc2FnZSB0b28gbGFyZ2UgKGNhbiBzZW5kIGEgbWF4aW11bSBvZiAnICtcbiAgICAgICAgICAgIHBjLnNjdHAubWF4TWVzc2FnZVNpemUgKyAnIGJ5dGVzKScsICdUeXBlRXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3JpZ0RhdGFDaGFubmVsU2VuZC5hcHBseShkYywgYXJndW1lbnRzKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBkYXRhQ2hhbm5lbDtcbiAgICB9O1xuICB9XG59O1xuXG59LHtcIi4vdXRpbHNcIjoxMyxcInNkcFwiOjJ9XSw4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuIC8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIHNoaW1SVENQZWVyQ29ubmVjdGlvbiA9IHJlcXVpcmUoJ3J0Y3BlZXJjb25uZWN0aW9uLXNoaW0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHNoaW1HZXRVc2VyTWVkaWE6IHJlcXVpcmUoJy4vZ2V0dXNlcm1lZGlhJyksXG4gIHNoaW1QZWVyQ29ubmVjdGlvbjogZnVuY3Rpb24od2luZG93KSB7XG4gICAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gICAgaWYgKHdpbmRvdy5SVENJY2VHYXRoZXJlcikge1xuICAgICAgaWYgKCF3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlKSB7XG4gICAgICAgIHdpbmRvdy5SVENJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAoIXdpbmRvdy5SVENTZXNzaW9uRGVzY3JpcHRpb24pIHtcbiAgICAgICAgd2luZG93LlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgICByZXR1cm4gYXJncztcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIC8vIHRoaXMgYWRkcyBhbiBhZGRpdGlvbmFsIGV2ZW50IGxpc3RlbmVyIHRvIE1lZGlhU3RyYWNrVHJhY2sgdGhhdCBzaWduYWxzXG4gICAgICAvLyB3aGVuIGEgdHJhY2tzIGVuYWJsZWQgcHJvcGVydHkgd2FzIGNoYW5nZWQuIFdvcmthcm91bmQgZm9yIGEgYnVnIGluXG4gICAgICAvLyBhZGRTdHJlYW0sIHNlZSBiZWxvdy4gTm8gbG9uZ2VyIHJlcXVpcmVkIGluIDE1MDI1K1xuICAgICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCAxNTAyNSkge1xuICAgICAgICB2YXIgb3JpZ01TVEVuYWJsZWQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFxuICAgICAgICAgICAgd2luZG93Lk1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLCAnZW5hYmxlZCcpO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93Lk1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLCAnZW5hYmxlZCcsIHtcbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBvcmlnTVNURW5hYmxlZC5zZXQuY2FsbCh0aGlzLCB2YWx1ZSk7XG4gICAgICAgICAgICB2YXIgZXYgPSBuZXcgRXZlbnQoJ2VuYWJsZWQnKTtcbiAgICAgICAgICAgIGV2LmVuYWJsZWQgPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPUlRDIGRlZmluZXMgdGhlIERUTUYgc2VuZGVyIGEgYml0IGRpZmZlcmVudC5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdzNjL29ydGMvaXNzdWVzLzcxNFxuICAgIGlmICh3aW5kb3cuUlRDUnRwU2VuZGVyICYmICEoJ2R0bWYnIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlLCAnZHRtZicsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodGhpcy5fZHRtZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50cmFjay5raW5kID09PSAnYXVkaW8nKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBuZXcgd2luZG93LlJUQ0R0bWZTZW5kZXIodGhpcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudHJhY2sua2luZCA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAgICAgICB0aGlzLl9kdG1mID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2R0bWY7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBFZGdlIGN1cnJlbnRseSBvbmx5IGltcGxlbWVudHMgdGhlIFJUQ0R0bWZTZW5kZXIsIG5vdCB0aGVcbiAgICAvLyBSVENEVE1GU2VuZGVyIGFsaWFzLiBTZWUgaHR0cDovL2RyYWZ0Lm9ydGMub3JnLyNydGNkdG1mc2VuZGVyMipcbiAgICBpZiAod2luZG93LlJUQ0R0bWZTZW5kZXIgJiYgIXdpbmRvdy5SVENEVE1GU2VuZGVyKSB7XG4gICAgICB3aW5kb3cuUlRDRFRNRlNlbmRlciA9IHdpbmRvdy5SVENEdG1mU2VuZGVyO1xuICAgIH1cblxuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiA9XG4gICAgICAgIHNoaW1SVENQZWVyQ29ubmVjdGlvbih3aW5kb3csIGJyb3dzZXJEZXRhaWxzLnZlcnNpb24pO1xuICB9LFxuICBzaGltUmVwbGFjZVRyYWNrOiBmdW5jdGlvbih3aW5kb3cpIHtcbiAgICAvLyBPUlRDIGhhcyByZXBsYWNlVHJhY2sgLS0gaHR0cHM6Ly9naXRodWIuY29tL3czYy9vcnRjL2lzc3Vlcy82MTRcbiAgICBpZiAod2luZG93LlJUQ1J0cFNlbmRlciAmJlxuICAgICAgICAhKCdyZXBsYWNlVHJhY2snIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlKSkge1xuICAgICAgd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUucmVwbGFjZVRyYWNrID1cbiAgICAgICAgICB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5zZXRUcmFjaztcbiAgICB9XG4gIH1cbn07XG5cbn0se1wiLi4vdXRpbHNcIjoxMyxcIi4vZ2V0dXNlcm1lZGlhXCI6OSxcInJ0Y3BlZXJjb25uZWN0aW9uLXNoaW1cIjoxfV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbiAvKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuLy8gRXhwb3NlIHB1YmxpYyBtZXRob2RzLlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3aW5kb3cpIHtcbiAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xuXG4gIHZhciBzaGltRXJyb3JfID0gZnVuY3Rpb24oZSkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB7UGVybWlzc2lvbkRlbmllZEVycm9yOiAnTm90QWxsb3dlZEVycm9yJ31bZS5uYW1lXSB8fCBlLm5hbWUsXG4gICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICBjb25zdHJhaW50OiBlLmNvbnN0cmFpbnQsXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBnZXRVc2VyTWVkaWEgZXJyb3Igc2hpbS5cbiAgdmFyIG9yaWdHZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5cbiAgICAgIGJpbmQobmF2aWdhdG9yLm1lZGlhRGV2aWNlcyk7XG4gIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24oYykge1xuICAgIHJldHVybiBvcmlnR2V0VXNlck1lZGlhKGMpLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChzaGltRXJyb3JfKGUpKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbn0se31dLDEwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuIC8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc2hpbUdldFVzZXJNZWRpYTogcmVxdWlyZSgnLi9nZXR1c2VybWVkaWEnKSxcbiAgc2hpbU9uVHJhY2s6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgISgnb250cmFjaycgaW5cbiAgICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAnb250cmFjaycsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fb250cmFjaztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbihmKSB7XG4gICAgICAgICAgaWYgKHRoaXMuX29udHJhY2spIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndHJhY2snLCB0aGlzLl9vbnRyYWNrKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWRkc3RyZWFtJywgdGhpcy5fb250cmFja3BvbHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYWNrJywgdGhpcy5fb250cmFjayA9IGYpO1xuICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignYWRkc3RyZWFtJywgdGhpcy5fb250cmFja3BvbHkgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgICAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgndHJhY2snKTtcbiAgICAgICAgICAgICAgZXZlbnQudHJhY2sgPSB0cmFjaztcbiAgICAgICAgICAgICAgZXZlbnQucmVjZWl2ZXIgPSB7dHJhY2s6IHRyYWNrfTtcbiAgICAgICAgICAgICAgZXZlbnQudHJhbnNjZWl2ZXIgPSB7cmVjZWl2ZXI6IGV2ZW50LnJlY2VpdmVyfTtcbiAgICAgICAgICAgICAgZXZlbnQuc3RyZWFtcyA9IFtlLnN0cmVhbV07XG4gICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1RyYWNrRXZlbnQgJiZcbiAgICAgICAgKCdyZWNlaXZlcicgaW4gd2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlKSAmJlxuICAgICAgICAhKCd0cmFuc2NlaXZlcicgaW4gd2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENUcmFja0V2ZW50LnByb3RvdHlwZSwgJ3RyYW5zY2VpdmVyJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7cmVjZWl2ZXI6IHRoaXMucmVjZWl2ZXJ9O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgc2hpbVNvdXJjZU9iamVjdDogZnVuY3Rpb24od2luZG93KSB7XG4gICAgLy8gRmlyZWZveCBoYXMgc3VwcG9ydGVkIG1velNyY09iamVjdCBzaW5jZSBGRjIyLCB1bnByZWZpeGVkIGluIDQyLlxuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50ICYmXG4gICAgICAgICEoJ3NyY09iamVjdCcgaW4gd2luZG93LkhUTUxNZWRpYUVsZW1lbnQucHJvdG90eXBlKSkge1xuICAgICAgICAvLyBTaGltIHRoZSBzcmNPYmplY3QgcHJvcGVydHksIG9uY2UsIHdoZW4gSFRNTE1lZGlhRWxlbWVudCBpcyBmb3VuZC5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50LnByb3RvdHlwZSwgJ3NyY09iamVjdCcsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW96U3JjT2JqZWN0O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgICAgIHRoaXMubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNoaW1QZWVyQ29ubmVjdGlvbjogZnVuY3Rpb24od2luZG93KSB7XG4gICAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICdvYmplY3QnIHx8ICEod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uIHx8XG4gICAgICAgIHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbikpIHtcbiAgICAgIHJldHVybjsgLy8gcHJvYmFibHkgbWVkaWEucGVlcmNvbm5lY3Rpb24uZW5hYmxlZD1mYWxzZSBpbiBhYm91dDpjb25maWdcbiAgICB9XG4gICAgLy8gVGhlIFJUQ1BlZXJDb25uZWN0aW9uIG9iamVjdC5cbiAgICBpZiAoIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uID0gZnVuY3Rpb24ocGNDb25maWcsIHBjQ29uc3RyYWludHMpIHtcbiAgICAgICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCAzOCkge1xuICAgICAgICAgIC8vIC51cmxzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gRkYgPCAzOC5cbiAgICAgICAgICAvLyBjcmVhdGUgUlRDSWNlU2VydmVycyB3aXRoIGEgc2luZ2xlIHVybC5cbiAgICAgICAgICBpZiAocGNDb25maWcgJiYgcGNDb25maWcuaWNlU2VydmVycykge1xuICAgICAgICAgICAgdmFyIG5ld0ljZVNlcnZlcnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGNDb25maWcuaWNlU2VydmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICB2YXIgc2VydmVyID0gcGNDb25maWcuaWNlU2VydmVyc1tpXTtcbiAgICAgICAgICAgICAgaWYgKHNlcnZlci5oYXNPd25Qcm9wZXJ0eSgndXJscycpKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzZXJ2ZXIudXJscy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgdmFyIG5ld1NlcnZlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBzZXJ2ZXIudXJsc1tqXVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgIGlmIChzZXJ2ZXIudXJsc1tqXS5pbmRleE9mKCd0dXJuJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3U2VydmVyLnVzZXJuYW1lID0gc2VydmVyLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICBuZXdTZXJ2ZXIuY3JlZGVudGlhbCA9IHNlcnZlci5jcmVkZW50aWFsO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgbmV3SWNlU2VydmVycy5wdXNoKG5ld1NlcnZlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0ljZVNlcnZlcnMucHVzaChwY0NvbmZpZy5pY2VTZXJ2ZXJzW2ldKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGNDb25maWcuaWNlU2VydmVycyA9IG5ld0ljZVNlcnZlcnM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgd2luZG93Lm1velJUQ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnLCBwY0NvbnN0cmFpbnRzKTtcbiAgICAgIH07XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlID1cbiAgICAgICAgICB3aW5kb3cubW96UlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlO1xuXG4gICAgICAvLyB3cmFwIHN0YXRpYyBtZXRob2RzLiBDdXJyZW50bHkganVzdCBnZW5lcmF0ZUNlcnRpZmljYXRlLlxuICAgICAgaWYgKHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbi5nZW5lcmF0ZUNlcnRpZmljYXRlKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24sICdnZW5lcmF0ZUNlcnRpZmljYXRlJywge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gd2luZG93Lm1velJUQ1BlZXJDb25uZWN0aW9uLmdlbmVyYXRlQ2VydGlmaWNhdGU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgd2luZG93LlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IHdpbmRvdy5tb3pSVENTZXNzaW9uRGVzY3JpcHRpb247XG4gICAgICB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlID0gd2luZG93Lm1velJUQ0ljZUNhbmRpZGF0ZTtcbiAgICB9XG5cbiAgICAvLyBzaGltIGF3YXkgbmVlZCBmb3Igb2Jzb2xldGUgUlRDSWNlQ2FuZGlkYXRlL1JUQ1Nlc3Npb25EZXNjcmlwdGlvbi5cbiAgICBbJ3NldExvY2FsRGVzY3JpcHRpb24nLCAnc2V0UmVtb3RlRGVzY3JpcHRpb24nLCAnYWRkSWNlQ2FuZGlkYXRlJ11cbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgICAgICAgdmFyIG5hdGl2ZU1ldGhvZCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICAgICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFyZ3VtZW50c1swXSA9IG5ldyAoKG1ldGhvZCA9PT0gJ2FkZEljZUNhbmRpZGF0ZScpID9cbiAgICAgICAgICAgICAgICB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlIDpcbiAgICAgICAgICAgICAgICB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKShhcmd1bWVudHNbMF0pO1xuICAgICAgICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgLy8gc3VwcG9ydCBmb3IgYWRkSWNlQ2FuZGlkYXRlKG51bGwgb3IgdW5kZWZpbmVkKVxuICAgIHZhciBuYXRpdmVBZGRJY2VDYW5kaWRhdGUgPVxuICAgICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZTtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFhcmd1bWVudHNbMF0pIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50c1sxXSkge1xuICAgICAgICAgIGFyZ3VtZW50c1sxXS5hcHBseShudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlQWRkSWNlQ2FuZGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIC8vIHNoaW0gZ2V0U3RhdHMgd2l0aCBtYXBsaWtlIHN1cHBvcnRcbiAgICB2YXIgbWFrZU1hcFN0YXRzID0gZnVuY3Rpb24oc3RhdHMpIHtcbiAgICAgIHZhciBtYXAgPSBuZXcgTWFwKCk7XG4gICAgICBPYmplY3Qua2V5cyhzdGF0cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgbWFwLnNldChrZXksIHN0YXRzW2tleV0pO1xuICAgICAgICBtYXBba2V5XSA9IHN0YXRzW2tleV07XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBtYXA7XG4gICAgfTtcblxuICAgIHZhciBtb2Rlcm5TdGF0c1R5cGVzID0ge1xuICAgICAgaW5ib3VuZHJ0cDogJ2luYm91bmQtcnRwJyxcbiAgICAgIG91dGJvdW5kcnRwOiAnb3V0Ym91bmQtcnRwJyxcbiAgICAgIGNhbmRpZGF0ZXBhaXI6ICdjYW5kaWRhdGUtcGFpcicsXG4gICAgICBsb2NhbGNhbmRpZGF0ZTogJ2xvY2FsLWNhbmRpZGF0ZScsXG4gICAgICByZW1vdGVjYW5kaWRhdGU6ICdyZW1vdGUtY2FuZGlkYXRlJ1xuICAgIH07XG5cbiAgICB2YXIgbmF0aXZlR2V0U3RhdHMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFN0YXRzO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbihcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgb25TdWNjLFxuICAgICAgb25FcnJcbiAgICApIHtcbiAgICAgIHJldHVybiBuYXRpdmVHZXRTdGF0cy5hcHBseSh0aGlzLCBbc2VsZWN0b3IgfHwgbnVsbF0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHN0YXRzKSB7XG4gICAgICAgICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA0OCkge1xuICAgICAgICAgICAgc3RhdHMgPSBtYWtlTWFwU3RhdHMoc3RhdHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDUzICYmICFvblN1Y2MpIHtcbiAgICAgICAgICAgIC8vIFNoaW0gb25seSBwcm9taXNlIGdldFN0YXRzIHdpdGggc3BlYy1oeXBoZW5zIGluIHR5cGUgbmFtZXNcbiAgICAgICAgICAgIC8vIExlYXZlIGNhbGxiYWNrIHZlcnNpb24gYWxvbmU7IG1pc2Mgb2xkIHVzZXMgb2YgZm9yRWFjaCBiZWZvcmUgTWFwXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdGF0cy5mb3JFYWNoKGZ1bmN0aW9uKHN0YXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0LnR5cGUgPSBtb2Rlcm5TdGF0c1R5cGVzW3N0YXQudHlwZV0gfHwgc3RhdC50eXBlO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gJ1R5cGVFcnJvcicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIEF2b2lkIFR5cGVFcnJvcjogXCJ0eXBlXCIgaXMgcmVhZC1vbmx5LCBpbiBvbGQgdmVyc2lvbnMuIDM0LTQzaXNoXG4gICAgICAgICAgICAgIHN0YXRzLmZvckVhY2goZnVuY3Rpb24oc3RhdCwgaSkge1xuICAgICAgICAgICAgICAgIHN0YXRzLnNldChpLCBPYmplY3QuYXNzaWduKHt9LCBzdGF0LCB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBtb2Rlcm5TdGF0c1R5cGVzW3N0YXQudHlwZV0gfHwgc3RhdC50eXBlXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHN0YXRzO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihvblN1Y2MsIG9uRXJyKTtcbiAgICB9O1xuICB9LFxuXG4gIHNoaW1SZW1vdmVTdHJlYW06IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uIHx8XG4gICAgICAgICdyZW1vdmVTdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICB1dGlscy5kZXByZWNhdGVkKCdyZW1vdmVTdHJlYW0nLCAncmVtb3ZlVHJhY2snKTtcbiAgICAgIHRoaXMuZ2V0U2VuZGVycygpLmZvckVhY2goZnVuY3Rpb24oc2VuZGVyKSB7XG4gICAgICAgIGlmIChzZW5kZXIudHJhY2sgJiYgc3RyZWFtLmdldFRyYWNrcygpLmluZGV4T2Yoc2VuZGVyLnRyYWNrKSAhPT0gLTEpIHtcbiAgICAgICAgICBwYy5yZW1vdmVUcmFjayhzZW5kZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59O1xuXG59LHtcIi4uL3V0aWxzXCI6MTMsXCIuL2dldHVzZXJtZWRpYVwiOjExfV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4gLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgbG9nZ2luZyA9IHV0aWxzLmxvZztcblxuLy8gRXhwb3NlIHB1YmxpYyBtZXRob2RzLlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3aW5kb3cpIHtcbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuICB2YXIgbmF2aWdhdG9yID0gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3I7XG4gIHZhciBNZWRpYVN0cmVhbVRyYWNrID0gd2luZG93ICYmIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrO1xuXG4gIHZhciBzaGltRXJyb3JfID0gZnVuY3Rpb24oZSkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB7XG4gICAgICAgIEludGVybmFsRXJyb3I6ICdOb3RSZWFkYWJsZUVycm9yJyxcbiAgICAgICAgTm90U3VwcG9ydGVkRXJyb3I6ICdUeXBlRXJyb3InLFxuICAgICAgICBQZXJtaXNzaW9uRGVuaWVkRXJyb3I6ICdOb3RBbGxvd2VkRXJyb3InLFxuICAgICAgICBTZWN1cml0eUVycm9yOiAnTm90QWxsb3dlZEVycm9yJ1xuICAgICAgfVtlLm5hbWVdIHx8IGUubmFtZSxcbiAgICAgIG1lc3NhZ2U6IHtcbiAgICAgICAgJ1RoZSBvcGVyYXRpb24gaXMgaW5zZWN1cmUuJzogJ1RoZSByZXF1ZXN0IGlzIG5vdCBhbGxvd2VkIGJ5IHRoZSAnICtcbiAgICAgICAgJ3VzZXIgYWdlbnQgb3IgdGhlIHBsYXRmb3JtIGluIHRoZSBjdXJyZW50IGNvbnRleHQuJ1xuICAgICAgfVtlLm1lc3NhZ2VdIHx8IGUubWVzc2FnZSxcbiAgICAgIGNvbnN0cmFpbnQ6IGUuY29uc3RyYWludCxcbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZSArICh0aGlzLm1lc3NhZ2UgJiYgJzogJykgKyB0aGlzLm1lc3NhZ2U7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBnZXRVc2VyTWVkaWEgY29uc3RyYWludHMgc2hpbS5cbiAgdmFyIGdldFVzZXJNZWRpYV8gPSBmdW5jdGlvbihjb25zdHJhaW50cywgb25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgdmFyIGNvbnN0cmFpbnRzVG9GRjM3XyA9IGZ1bmN0aW9uKGMpIHtcbiAgICAgIGlmICh0eXBlb2YgYyAhPT0gJ29iamVjdCcgfHwgYy5yZXF1aXJlKSB7XG4gICAgICAgIHJldHVybiBjO1xuICAgICAgfVxuICAgICAgdmFyIHJlcXVpcmUgPSBbXTtcbiAgICAgIE9iamVjdC5rZXlzKGMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmIChrZXkgPT09ICdyZXF1aXJlJyB8fCBrZXkgPT09ICdhZHZhbmNlZCcgfHwga2V5ID09PSAnbWVkaWFTb3VyY2UnKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciByID0gY1trZXldID0gKHR5cGVvZiBjW2tleV0gPT09ICdvYmplY3QnKSA/XG4gICAgICAgICAgICBjW2tleV0gOiB7aWRlYWw6IGNba2V5XX07XG4gICAgICAgIGlmIChyLm1pbiAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgICByLm1heCAhPT0gdW5kZWZpbmVkIHx8IHIuZXhhY3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJlcXVpcmUucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyLmV4YWN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHIuZXhhY3QgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICByLiBtaW4gPSByLm1heCA9IHIuZXhhY3Q7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNba2V5XSA9IHIuZXhhY3Q7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSByLmV4YWN0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChyLmlkZWFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjLmFkdmFuY2VkID0gYy5hZHZhbmNlZCB8fCBbXTtcbiAgICAgICAgICB2YXIgb2MgPSB7fTtcbiAgICAgICAgICBpZiAodHlwZW9mIHIuaWRlYWwgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBvY1trZXldID0ge21pbjogci5pZGVhbCwgbWF4OiByLmlkZWFsfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2Nba2V5XSA9IHIuaWRlYWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGMuYWR2YW5jZWQucHVzaChvYyk7XG4gICAgICAgICAgZGVsZXRlIHIuaWRlYWw7XG4gICAgICAgICAgaWYgKCFPYmplY3Qua2V5cyhyKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChyZXF1aXJlLmxlbmd0aCkge1xuICAgICAgICBjLnJlcXVpcmUgPSByZXF1aXJlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGM7XG4gICAgfTtcbiAgICBjb25zdHJhaW50cyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uc3RyYWludHMpKTtcbiAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDM4KSB7XG4gICAgICBsb2dnaW5nKCdzcGVjOiAnICsgSlNPTi5zdHJpbmdpZnkoY29uc3RyYWludHMpKTtcbiAgICAgIGlmIChjb25zdHJhaW50cy5hdWRpbykge1xuICAgICAgICBjb25zdHJhaW50cy5hdWRpbyA9IGNvbnN0cmFpbnRzVG9GRjM3Xyhjb25zdHJhaW50cy5hdWRpbyk7XG4gICAgICB9XG4gICAgICBpZiAoY29uc3RyYWludHMudmlkZW8pIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8gPSBjb25zdHJhaW50c1RvRkYzN18oY29uc3RyYWludHMudmlkZW8pO1xuICAgICAgfVxuICAgICAgbG9nZ2luZygnZmYzNzogJyArIEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzKSk7XG4gICAgfVxuICAgIHJldHVybiBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBvblN1Y2Nlc3MsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIG9uRXJyb3Ioc2hpbUVycm9yXyhlKSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgcmVzdWx0IG9mIGdldFVzZXJNZWRpYSBhcyBhIFByb21pc2UuXG4gIHZhciBnZXRVc2VyTWVkaWFQcm9taXNlXyA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgZ2V0VXNlck1lZGlhXyhjb25zdHJhaW50cywgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBTaGltIGZvciBtZWRpYURldmljZXMgb24gb2xkZXIgdmVyc2lvbnMuXG4gIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMgPSB7Z2V0VXNlck1lZGlhOiBnZXRVc2VyTWVkaWFQcm9taXNlXyxcbiAgICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uKCkgeyB9LFxuICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24oKSB7IH1cbiAgICB9O1xuICB9XG4gIG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcyA9XG4gICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMgfHwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgICAgdmFyIGluZm9zID0gW1xuICAgICAgICAgICAge2tpbmQ6ICdhdWRpb2lucHV0JywgZGV2aWNlSWQ6ICdkZWZhdWx0JywgbGFiZWw6ICcnLCBncm91cElkOiAnJ30sXG4gICAgICAgICAgICB7a2luZDogJ3ZpZGVvaW5wdXQnLCBkZXZpY2VJZDogJ2RlZmF1bHQnLCBsYWJlbDogJycsIGdyb3VwSWQ6ICcnfVxuICAgICAgICAgIF07XG4gICAgICAgICAgcmVzb2x2ZShpbmZvcyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDQxKSB7XG4gICAgLy8gV29yayBhcm91bmQgaHR0cDovL2J1Z3ppbC5sYS8xMTY5NjY1XG4gICAgdmFyIG9yZ0VudW1lcmF0ZURldmljZXMgPVxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMuYmluZChuYXZpZ2F0b3IubWVkaWFEZXZpY2VzKTtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBvcmdFbnVtZXJhdGVEZXZpY2VzKCkudGhlbih1bmRlZmluZWQsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUubmFtZSA9PT0gJ05vdEZvdW5kRXJyb3InKSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG4gIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNDkpIHtcbiAgICB2YXIgb3JpZ0dldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhLlxuICAgICAgICBiaW5kKG5hdmlnYXRvci5tZWRpYURldmljZXMpO1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24oYykge1xuICAgICAgcmV0dXJuIG9yaWdHZXRVc2VyTWVkaWEoYykudGhlbihmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgLy8gV29yayBhcm91bmQgaHR0cHM6Ly9idWd6aWwubGEvODAyMzI2XG4gICAgICAgIGlmIChjLmF1ZGlvICYmICFzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKS5sZW5ndGggfHxcbiAgICAgICAgICAgIGMudmlkZW8gJiYgIXN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCkge1xuICAgICAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignVGhlIG9iamVjdCBjYW4gbm90IGJlIGZvdW5kIGhlcmUuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdOb3RGb3VuZEVycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHNoaW1FcnJvcl8oZSkpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuICBpZiAoIShicm93c2VyRGV0YWlscy52ZXJzaW9uID4gNTUgJiZcbiAgICAgICdhdXRvR2FpbkNvbnRyb2wnIGluIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0U3VwcG9ydGVkQ29uc3RyYWludHMoKSkpIHtcbiAgICB2YXIgcmVtYXAgPSBmdW5jdGlvbihvYmosIGEsIGIpIHtcbiAgICAgIGlmIChhIGluIG9iaiAmJiAhKGIgaW4gb2JqKSkge1xuICAgICAgICBvYmpbYl0gPSBvYmpbYV07XG4gICAgICAgIGRlbGV0ZSBvYmpbYV07XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBuYXRpdmVHZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5cbiAgICAgICAgYmluZChuYXZpZ2F0b3IubWVkaWFEZXZpY2VzKTtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSA9IGZ1bmN0aW9uKGMpIHtcbiAgICAgIGlmICh0eXBlb2YgYyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGMuYXVkaW8gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGMpKTtcbiAgICAgICAgcmVtYXAoYy5hdWRpbywgJ2F1dG9HYWluQ29udHJvbCcsICdtb3pBdXRvR2FpbkNvbnRyb2wnKTtcbiAgICAgICAgcmVtYXAoYy5hdWRpbywgJ25vaXNlU3VwcHJlc3Npb24nLCAnbW96Tm9pc2VTdXBwcmVzc2lvbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZUdldFVzZXJNZWRpYShjKTtcbiAgICB9O1xuXG4gICAgaWYgKE1lZGlhU3RyZWFtVHJhY2sgJiYgTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuZ2V0U2V0dGluZ3MpIHtcbiAgICAgIHZhciBuYXRpdmVHZXRTZXR0aW5ncyA9IE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmdldFNldHRpbmdzO1xuICAgICAgTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuZ2V0U2V0dGluZ3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9iaiA9IG5hdGl2ZUdldFNldHRpbmdzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJlbWFwKG9iaiwgJ21vekF1dG9HYWluQ29udHJvbCcsICdhdXRvR2FpbkNvbnRyb2wnKTtcbiAgICAgICAgcmVtYXAob2JqLCAnbW96Tm9pc2VTdXBwcmVzc2lvbicsICdub2lzZVN1cHByZXNzaW9uJyk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChNZWRpYVN0cmVhbVRyYWNrICYmIE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmFwcGx5Q29uc3RyYWludHMpIHtcbiAgICAgIHZhciBuYXRpdmVBcHBseUNvbnN0cmFpbnRzID0gTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuYXBwbHlDb25zdHJhaW50cztcbiAgICAgIE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmFwcGx5Q29uc3RyYWludHMgPSBmdW5jdGlvbihjKSB7XG4gICAgICAgIGlmICh0aGlzLmtpbmQgPT09ICdhdWRpbycgJiYgdHlwZW9mIGMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYykpO1xuICAgICAgICAgIHJlbWFwKGMsICdhdXRvR2FpbkNvbnRyb2wnLCAnbW96QXV0b0dhaW5Db250cm9sJyk7XG4gICAgICAgICAgcmVtYXAoYywgJ25vaXNlU3VwcHJlc3Npb24nLCAnbW96Tm9pc2VTdXBwcmVzc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuYXRpdmVBcHBseUNvbnN0cmFpbnRzLmFwcGx5KHRoaXMsIFtjXSk7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24oY29uc3RyYWludHMsIG9uU3VjY2Vzcywgb25FcnJvcikge1xuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNDQpIHtcbiAgICAgIHJldHVybiBnZXRVc2VyTWVkaWFfKGNvbnN0cmFpbnRzLCBvblN1Y2Nlc3MsIG9uRXJyb3IpO1xuICAgIH1cbiAgICAvLyBSZXBsYWNlIEZpcmVmb3ggNDQrJ3MgZGVwcmVjYXRpb24gd2FybmluZyB3aXRoIHVucHJlZml4ZWQgdmVyc2lvbi5cbiAgICB1dGlscy5kZXByZWNhdGVkKCduYXZpZ2F0b3IuZ2V0VXNlck1lZGlhJyxcbiAgICAgICAgJ25hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhJyk7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpLnRoZW4ob25TdWNjZXNzLCBvbkVycm9yKTtcbiAgfTtcbn07XG5cbn0se1wiLi4vdXRpbHNcIjoxM31dLDEyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHNoaW1Mb2NhbFN0cmVhbXNBUEk6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAnb2JqZWN0JyB8fCAhd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghKCdnZXRMb2NhbFN0cmVhbXMnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldExvY2FsU3RyZWFtcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvY2FsU3RyZWFtcykge1xuICAgICAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2NhbFN0cmVhbXM7XG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAoISgnZ2V0U3RyZWFtQnlJZCcgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RyZWFtQnlJZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5fbG9jYWxTdHJlYW1zKSB7XG4gICAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgICAgICBpZiAoc3RyZWFtLmlkID09PSBpZCkge1xuICAgICAgICAgICAgICByZXN1bHQgPSBzdHJlYW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX3JlbW90ZVN0cmVhbXMpIHtcbiAgICAgICAgICB0aGlzLl9yZW1vdGVTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgICAgICBpZiAoc3RyZWFtLmlkID09PSBpZCkge1xuICAgICAgICAgICAgICByZXN1bHQgPSBzdHJlYW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICghKCdhZGRTdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgICB2YXIgX2FkZFRyYWNrID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjaztcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgIGlmICghdGhpcy5fbG9jYWxTdHJlYW1zKSB7XG4gICAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zID0gW107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2xvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPT09IC0xKSB7XG4gICAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0cmFjaykge1xuICAgICAgICAgIF9hZGRUcmFjay5jYWxsKHBjLCB0cmFjaywgc3RyZWFtKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24odHJhY2ssIHN0cmVhbSkge1xuICAgICAgICBpZiAoc3RyZWFtKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLl9sb2NhbFN0cmVhbXMpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcyA9IFtzdHJlYW1dO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fbG9jYWxTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfYWRkVHJhY2suY2FsbCh0aGlzLCB0cmFjaywgc3RyZWFtKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICghKCdyZW1vdmVTdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvY2FsU3RyZWFtcykge1xuICAgICAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX2xvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSk7XG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICAgIHZhciB0cmFja3MgPSBzdHJlYW0uZ2V0VHJhY2tzKCk7XG4gICAgICAgIHRoaXMuZ2V0U2VuZGVycygpLmZvckVhY2goZnVuY3Rpb24oc2VuZGVyKSB7XG4gICAgICAgICAgaWYgKHRyYWNrcy5pbmRleE9mKHNlbmRlci50cmFjaykgIT09IC0xKSB7XG4gICAgICAgICAgICBwYy5yZW1vdmVUcmFjayhzZW5kZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH1cbiAgfSxcbiAgc2hpbVJlbW90ZVN0cmVhbXNBUEk6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAnb2JqZWN0JyB8fCAhd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghKCdnZXRSZW1vdGVTdHJlYW1zJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRSZW1vdGVTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZW1vdGVTdHJlYW1zID8gdGhpcy5fcmVtb3RlU3RyZWFtcyA6IFtdO1xuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCEoJ29uYWRkc3RyZWFtJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUsICdvbmFkZHN0cmVhbScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fb25hZGRzdHJlYW07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24oZikge1xuICAgICAgICAgIHZhciBwYyA9IHRoaXM7XG4gICAgICAgICAgaWYgKHRoaXMuX29uYWRkc3RyZWFtKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIHRoaXMuX29uYWRkc3RyZWFtKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndHJhY2snLCB0aGlzLl9vbmFkZHN0cmVhbXBvbHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIHRoaXMuX29uYWRkc3RyZWFtID0gZik7XG4gICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0cmFjaycsIHRoaXMuX29uYWRkc3RyZWFtcG9seSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUuc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICAgICAgICBpZiAoIXBjLl9yZW1vdGVTdHJlYW1zKSB7XG4gICAgICAgICAgICAgICAgcGMuX3JlbW90ZVN0cmVhbXMgPSBbXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocGMuX3JlbW90ZVN0cmVhbXMuaW5kZXhPZihzdHJlYW0pID49IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcGMuX3JlbW90ZVN0cmVhbXMucHVzaChzdHJlYW0pO1xuICAgICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2FkZHN0cmVhbScpO1xuICAgICAgICAgICAgICBldmVudC5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgICAgICAgIHBjLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgc2hpbUNhbGxiYWNrc0FQSTogZnVuY3Rpb24od2luZG93KSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICdvYmplY3QnIHx8ICF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHByb3RvdHlwZSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGU7XG4gICAgdmFyIGNyZWF0ZU9mZmVyID0gcHJvdG90eXBlLmNyZWF0ZU9mZmVyO1xuICAgIHZhciBjcmVhdGVBbnN3ZXIgPSBwcm90b3R5cGUuY3JlYXRlQW5zd2VyO1xuICAgIHZhciBzZXRMb2NhbERlc2NyaXB0aW9uID0gcHJvdG90eXBlLnNldExvY2FsRGVzY3JpcHRpb247XG4gICAgdmFyIHNldFJlbW90ZURlc2NyaXB0aW9uID0gcHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uO1xuICAgIHZhciBhZGRJY2VDYW5kaWRhdGUgPSBwcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlO1xuXG4gICAgcHJvdG90eXBlLmNyZWF0ZU9mZmVyID0gZnVuY3Rpb24oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgIHZhciBvcHRpb25zID0gKGFyZ3VtZW50cy5sZW5ndGggPj0gMikgPyBhcmd1bWVudHNbMl0gOiBhcmd1bWVudHNbMF07XG4gICAgICB2YXIgcHJvbWlzZSA9IGNyZWF0ZU9mZmVyLmFwcGx5KHRoaXMsIFtvcHRpb25zXSk7XG4gICAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfTtcblxuICAgIHByb3RvdHlwZS5jcmVhdGVBbnN3ZXIgPSBmdW5jdGlvbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgdmFyIG9wdGlvbnMgPSAoYXJndW1lbnRzLmxlbmd0aCA+PSAyKSA/IGFyZ3VtZW50c1syXSA6IGFyZ3VtZW50c1swXTtcbiAgICAgIHZhciBwcm9taXNlID0gY3JlYXRlQW5zd2VyLmFwcGx5KHRoaXMsIFtvcHRpb25zXSk7XG4gICAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfTtcblxuICAgIHZhciB3aXRoQ2FsbGJhY2sgPSBmdW5jdGlvbihkZXNjcmlwdGlvbiwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgIHZhciBwcm9taXNlID0gc2V0TG9jYWxEZXNjcmlwdGlvbi5hcHBseSh0aGlzLCBbZGVzY3JpcHRpb25dKTtcbiAgICAgIGlmICghZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuICAgICAgcHJvbWlzZS50aGVuKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9O1xuICAgIHByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uID0gd2l0aENhbGxiYWNrO1xuXG4gICAgd2l0aENhbGxiYWNrID0gZnVuY3Rpb24oZGVzY3JpcHRpb24sIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHNldFJlbW90ZURlc2NyaXB0aW9uLmFwcGx5KHRoaXMsIFtkZXNjcmlwdGlvbl0pO1xuICAgICAgaWYgKCFmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgICBwcm9taXNlLnRoZW4oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gd2l0aENhbGxiYWNrO1xuXG4gICAgd2l0aENhbGxiYWNrID0gZnVuY3Rpb24oY2FuZGlkYXRlLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgdmFyIHByb21pc2UgPSBhZGRJY2VDYW5kaWRhdGUuYXBwbHkodGhpcywgW2NhbmRpZGF0ZV0pO1xuICAgICAgaWYgKCFmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgICBwcm9taXNlLnRoZW4oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IHdpdGhDYWxsYmFjaztcbiAgfSxcbiAgc2hpbUdldFVzZXJNZWRpYTogZnVuY3Rpb24od2luZG93KSB7XG4gICAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xuXG4gICAgaWYgKCFuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKSB7XG4gICAgICBpZiAobmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSkge1xuICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvcik7XG4gICAgICB9IGVsc2UgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZXMgJiZcbiAgICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSkge1xuICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24oY29uc3RyYWludHMsIGNiLCBlcnJjYikge1xuICAgICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKVxuICAgICAgICAgIC50aGVuKGNiLCBlcnJjYik7XG4gICAgICAgIH0uYmluZChuYXZpZ2F0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgc2hpbVJUQ0ljZVNlcnZlclVybHM6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIC8vIG1pZ3JhdGUgZnJvbSBub24tc3BlYyBSVENJY2VTZXJ2ZXIudXJsIHRvIFJUQ0ljZVNlcnZlci51cmxzXG4gICAgdmFyIE9yaWdQZWVyQ29ubmVjdGlvbiA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbjtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbihwY0NvbmZpZywgcGNDb25zdHJhaW50cykge1xuICAgICAgaWYgKHBjQ29uZmlnICYmIHBjQ29uZmlnLmljZVNlcnZlcnMpIHtcbiAgICAgICAgdmFyIG5ld0ljZVNlcnZlcnMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwY0NvbmZpZy5pY2VTZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHNlcnZlciA9IHBjQ29uZmlnLmljZVNlcnZlcnNbaV07XG4gICAgICAgICAgaWYgKCFzZXJ2ZXIuaGFzT3duUHJvcGVydHkoJ3VybHMnKSAmJlxuICAgICAgICAgICAgICBzZXJ2ZXIuaGFzT3duUHJvcGVydHkoJ3VybCcpKSB7XG4gICAgICAgICAgICB1dGlscy5kZXByZWNhdGVkKCdSVENJY2VTZXJ2ZXIudXJsJywgJ1JUQ0ljZVNlcnZlci51cmxzJyk7XG4gICAgICAgICAgICBzZXJ2ZXIgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNlcnZlcikpO1xuICAgICAgICAgICAgc2VydmVyLnVybHMgPSBzZXJ2ZXIudXJsO1xuICAgICAgICAgICAgZGVsZXRlIHNlcnZlci51cmw7XG4gICAgICAgICAgICBuZXdJY2VTZXJ2ZXJzLnB1c2goc2VydmVyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3SWNlU2VydmVycy5wdXNoKHBjQ29uZmlnLmljZVNlcnZlcnNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwY0NvbmZpZy5pY2VTZXJ2ZXJzID0gbmV3SWNlU2VydmVycztcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgT3JpZ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnLCBwY0NvbnN0cmFpbnRzKTtcbiAgICB9O1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUgPSBPcmlnUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlO1xuICAgIC8vIHdyYXAgc3RhdGljIG1ldGhvZHMuIEN1cnJlbnRseSBqdXN0IGdlbmVyYXRlQ2VydGlmaWNhdGUuXG4gICAgaWYgKCdnZW5lcmF0ZUNlcnRpZmljYXRlJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24sICdnZW5lcmF0ZUNlcnRpZmljYXRlJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBPcmlnUGVlckNvbm5lY3Rpb24uZ2VuZXJhdGVDZXJ0aWZpY2F0ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBzaGltVHJhY2tFdmVudFRyYW5zY2VpdmVyOiBmdW5jdGlvbih3aW5kb3cpIHtcbiAgICAvLyBBZGQgZXZlbnQudHJhbnNjZWl2ZXIgbWVtYmVyIG92ZXIgZGVwcmVjYXRlZCBldmVudC5yZWNlaXZlclxuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiZcbiAgICAgICAgKCdyZWNlaXZlcicgaW4gd2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlKSAmJlxuICAgICAgICAvLyBjYW4ndCBjaGVjayAndHJhbnNjZWl2ZXInIGluIHdpbmRvdy5SVENUcmFja0V2ZW50LnByb3RvdHlwZSwgYXMgaXQgaXNcbiAgICAgICAgLy8gZGVmaW5lZCBmb3Igc29tZSByZWFzb24gZXZlbiB3aGVuIHdpbmRvdy5SVENUcmFuc2NlaXZlciBpcyBub3QuXG4gICAgICAgICF3aW5kb3cuUlRDVHJhbnNjZWl2ZXIpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDVHJhY2tFdmVudC5wcm90b3R5cGUsICd0cmFuc2NlaXZlcicsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge3JlY2VpdmVyOiB0aGlzLnJlY2VpdmVyfTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIHNoaW1DcmVhdGVPZmZlckxlZ2FjeTogZnVuY3Rpb24od2luZG93KSB7XG4gICAgdmFyIG9yaWdDcmVhdGVPZmZlciA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXI7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVPZmZlciA9IGZ1bmN0aW9uKG9mZmVyT3B0aW9ucykge1xuICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgIGlmIChvZmZlck9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAvLyBzdXBwb3J0IGJpdCB2YWx1ZXNcbiAgICAgICAgICBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyA9ICEhb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW87XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGF1ZGlvVHJhbnNjZWl2ZXIgPSBwYy5nZXRUcmFuc2NlaXZlcnMoKS5maW5kKGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICAgICAgcmV0dXJuIHRyYW5zY2VpdmVyLnNlbmRlci50cmFjayAmJlxuICAgICAgICAgICAgICB0cmFuc2NlaXZlci5zZW5kZXIudHJhY2sua2luZCA9PT0gJ2F1ZGlvJztcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyA9PT0gZmFsc2UgJiYgYXVkaW9UcmFuc2NlaXZlcikge1xuICAgICAgICAgIGlmIChhdWRpb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2Jykge1xuICAgICAgICAgICAgaWYgKGF1ZGlvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKSB7XG4gICAgICAgICAgICAgIGF1ZGlvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKCdzZW5kb25seScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXVkaW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPSAnc2VuZG9ubHknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoYXVkaW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPT09ICdyZWN2b25seScpIHtcbiAgICAgICAgICAgIGlmIChhdWRpb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbikge1xuICAgICAgICAgICAgICBhdWRpb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbignaW5hY3RpdmUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF1ZGlvVHJhbnNjZWl2ZXIuZGlyZWN0aW9uID0gJ2luYWN0aXZlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IHRydWUgJiZcbiAgICAgICAgICAgICFhdWRpb1RyYW5zY2VpdmVyKSB7XG4gICAgICAgICAgcGMuYWRkVHJhbnNjZWl2ZXIoJ2F1ZGlvJyk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICh0eXBlb2Ygb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgLy8gc3VwcG9ydCBiaXQgdmFsdWVzXG4gICAgICAgICAgb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlVmlkZW8gPSAhIW9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2aWRlb1RyYW5zY2VpdmVyID0gcGMuZ2V0VHJhbnNjZWl2ZXJzKCkuZmluZChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgICAgIHJldHVybiB0cmFuc2NlaXZlci5zZW5kZXIudHJhY2sgJiZcbiAgICAgICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZGVyLnRyYWNrLmtpbmQgPT09ICd2aWRlbyc7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlVmlkZW8gPT09IGZhbHNlICYmIHZpZGVvVHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgICBpZiAodmlkZW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPT09ICdzZW5kcmVjdicpIHtcbiAgICAgICAgICAgIHZpZGVvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKCdzZW5kb25seScpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodmlkZW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPT09ICdyZWN2b25seScpIHtcbiAgICAgICAgICAgIHZpZGVvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKCdpbmFjdGl2ZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gdHJ1ZSAmJlxuICAgICAgICAgICAgIXZpZGVvVHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgICBwYy5hZGRUcmFuc2NlaXZlcigndmlkZW8nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdDcmVhdGVPZmZlci5hcHBseShwYywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG59O1xuXG59LHtcIi4uL3V0aWxzXCI6MTN9XSwxMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbiAvKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGxvZ0Rpc2FibGVkXyA9IHRydWU7XG52YXIgZGVwcmVjYXRpb25XYXJuaW5nc18gPSB0cnVlO1xuXG4vKipcbiAqIEV4dHJhY3QgYnJvd3NlciB2ZXJzaW9uIG91dCBvZiB0aGUgcHJvdmlkZWQgdXNlciBhZ2VudCBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHshc3RyaW5nfSB1YXN0cmluZyB1c2VyQWdlbnQgc3RyaW5nLlxuICogQHBhcmFtIHshc3RyaW5nfSBleHByIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIGFzIG1hdGNoIGNyaXRlcmlhLlxuICogQHBhcmFtIHshbnVtYmVyfSBwb3MgcG9zaXRpb24gaW4gdGhlIHZlcnNpb24gc3RyaW5nIHRvIGJlIHJldHVybmVkLlxuICogQHJldHVybiB7IW51bWJlcn0gYnJvd3NlciB2ZXJzaW9uLlxuICovXG5mdW5jdGlvbiBleHRyYWN0VmVyc2lvbih1YXN0cmluZywgZXhwciwgcG9zKSB7XG4gIHZhciBtYXRjaCA9IHVhc3RyaW5nLm1hdGNoKGV4cHIpO1xuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2gubGVuZ3RoID49IHBvcyAmJiBwYXJzZUludChtYXRjaFtwb3NdLCAxMCk7XG59XG5cbi8vIFdyYXBzIHRoZSBwZWVyY29ubmVjdGlvbiBldmVudCBldmVudE5hbWVUb1dyYXAgaW4gYSBmdW5jdGlvblxuLy8gd2hpY2ggcmV0dXJucyB0aGUgbW9kaWZpZWQgZXZlbnQgb2JqZWN0LlxuZnVuY3Rpb24gd3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCBldmVudE5hbWVUb1dyYXAsIHdyYXBwZXIpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHByb3RvID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZTtcbiAgdmFyIG5hdGl2ZUFkZEV2ZW50TGlzdGVuZXIgPSBwcm90by5hZGRFdmVudExpc3RlbmVyO1xuICBwcm90by5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24obmF0aXZlRXZlbnROYW1lLCBjYikge1xuICAgIGlmIChuYXRpdmVFdmVudE5hbWUgIT09IGV2ZW50TmFtZVRvV3JhcCkge1xuICAgICAgcmV0dXJuIG5hdGl2ZUFkZEV2ZW50TGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGNiKHdyYXBwZXIoZSkpO1xuICAgIH07XG4gICAgdGhpcy5fZXZlbnRNYXAgPSB0aGlzLl9ldmVudE1hcCB8fCB7fTtcbiAgICB0aGlzLl9ldmVudE1hcFtjYl0gPSB3cmFwcGVkQ2FsbGJhY2s7XG4gICAgcmV0dXJuIG5hdGl2ZUFkZEV2ZW50TGlzdGVuZXIuYXBwbHkodGhpcywgW25hdGl2ZUV2ZW50TmFtZSxcbiAgICAgIHdyYXBwZWRDYWxsYmFja10pO1xuICB9O1xuXG4gIHZhciBuYXRpdmVSZW1vdmVFdmVudExpc3RlbmVyID0gcHJvdG8ucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcbiAgcHJvdG8ucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKG5hdGl2ZUV2ZW50TmFtZSwgY2IpIHtcbiAgICBpZiAobmF0aXZlRXZlbnROYW1lICE9PSBldmVudE5hbWVUb1dyYXAgfHwgIXRoaXMuX2V2ZW50TWFwXG4gICAgICAgIHx8ICF0aGlzLl9ldmVudE1hcFtjYl0pIHtcbiAgICAgIHJldHVybiBuYXRpdmVSZW1vdmVFdmVudExpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHZhciB1bndyYXBwZWRDYiA9IHRoaXMuX2V2ZW50TWFwW2NiXTtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRNYXBbY2JdO1xuICAgIHJldHVybiBuYXRpdmVSZW1vdmVFdmVudExpc3RlbmVyLmFwcGx5KHRoaXMsIFtuYXRpdmVFdmVudE5hbWUsXG4gICAgICB1bndyYXBwZWRDYl0pO1xuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ29uJyArIGV2ZW50TmFtZVRvV3JhcCwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpc1snX29uJyArIGV2ZW50TmFtZVRvV3JhcF07XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGNiKSB7XG4gICAgICBpZiAodGhpc1snX29uJyArIGV2ZW50TmFtZVRvV3JhcF0pIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZVRvV3JhcCxcbiAgICAgICAgICAgIHRoaXNbJ19vbicgKyBldmVudE5hbWVUb1dyYXBdKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbJ19vbicgKyBldmVudE5hbWVUb1dyYXBdO1xuICAgICAgfVxuICAgICAgaWYgKGNiKSB7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWVUb1dyYXAsXG4gICAgICAgICAgICB0aGlzWydfb24nICsgZXZlbnROYW1lVG9XcmFwXSA9IGNiKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vLyBVdGlsaXR5IG1ldGhvZHMuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZXh0cmFjdFZlcnNpb246IGV4dHJhY3RWZXJzaW9uLFxuICB3cmFwUGVlckNvbm5lY3Rpb25FdmVudDogd3JhcFBlZXJDb25uZWN0aW9uRXZlbnQsXG4gIGRpc2FibGVMb2c6IGZ1bmN0aW9uKGJvb2wpIHtcbiAgICBpZiAodHlwZW9mIGJvb2wgIT09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJndW1lbnQgdHlwZTogJyArIHR5cGVvZiBib29sICtcbiAgICAgICAgICAnLiBQbGVhc2UgdXNlIGEgYm9vbGVhbi4nKTtcbiAgICB9XG4gICAgbG9nRGlzYWJsZWRfID0gYm9vbDtcbiAgICByZXR1cm4gKGJvb2wpID8gJ2FkYXB0ZXIuanMgbG9nZ2luZyBkaXNhYmxlZCcgOlxuICAgICAgICAnYWRhcHRlci5qcyBsb2dnaW5nIGVuYWJsZWQnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEaXNhYmxlIG9yIGVuYWJsZSBkZXByZWNhdGlvbiB3YXJuaW5nc1xuICAgKiBAcGFyYW0geyFib29sZWFufSBib29sIHNldCB0byB0cnVlIHRvIGRpc2FibGUgd2FybmluZ3MuXG4gICAqL1xuICBkaXNhYmxlV2FybmluZ3M6IGZ1bmN0aW9uKGJvb2wpIHtcbiAgICBpZiAodHlwZW9mIGJvb2wgIT09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJndW1lbnQgdHlwZTogJyArIHR5cGVvZiBib29sICtcbiAgICAgICAgICAnLiBQbGVhc2UgdXNlIGEgYm9vbGVhbi4nKTtcbiAgICB9XG4gICAgZGVwcmVjYXRpb25XYXJuaW5nc18gPSAhYm9vbDtcbiAgICByZXR1cm4gJ2FkYXB0ZXIuanMgZGVwcmVjYXRpb24gd2FybmluZ3MgJyArIChib29sID8gJ2Rpc2FibGVkJyA6ICdlbmFibGVkJyk7XG4gIH0sXG5cbiAgbG9nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChsb2dEaXNhYmxlZF8pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgY29uc29sZS5sb2cgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3dzIGEgZGVwcmVjYXRpb24gd2FybmluZyBzdWdnZXN0aW5nIHRoZSBtb2Rlcm4gYW5kIHNwZWMtY29tcGF0aWJsZSBBUEkuXG4gICAqL1xuICBkZXByZWNhdGVkOiBmdW5jdGlvbihvbGRNZXRob2QsIG5ld01ldGhvZCkge1xuICAgIGlmICghZGVwcmVjYXRpb25XYXJuaW5nc18pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS53YXJuKG9sZE1ldGhvZCArICcgaXMgZGVwcmVjYXRlZCwgcGxlYXNlIHVzZSAnICsgbmV3TWV0aG9kICtcbiAgICAgICAgJyBpbnN0ZWFkLicpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBCcm93c2VyIGRldGVjdG9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9IHJlc3VsdCBjb250YWluaW5nIGJyb3dzZXIgYW5kIHZlcnNpb25cbiAgICogICAgIHByb3BlcnRpZXMuXG4gICAqL1xuICBkZXRlY3RCcm93c2VyOiBmdW5jdGlvbih3aW5kb3cpIHtcbiAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3I7XG5cbiAgICAvLyBSZXR1cm5lZCByZXN1bHQgb2JqZWN0LlxuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQuYnJvd3NlciA9IG51bGw7XG4gICAgcmVzdWx0LnZlcnNpb24gPSBudWxsO1xuXG4gICAgLy8gRmFpbCBlYXJseSBpZiBpdCdzIG5vdCBhIGJyb3dzZXJcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgIXdpbmRvdy5uYXZpZ2F0b3IpIHtcbiAgICAgIHJlc3VsdC5icm93c2VyID0gJ05vdCBhIGJyb3dzZXIuJztcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgaWYgKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHsgLy8gRmlyZWZveC5cbiAgICAgIHJlc3VsdC5icm93c2VyID0gJ2ZpcmVmb3gnO1xuICAgICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICAgIC9GaXJlZm94XFwvKFxcZCspXFwuLywgMSk7XG4gICAgfSBlbHNlIGlmIChuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKSB7XG4gICAgICAvLyBDaHJvbWUsIENocm9taXVtLCBXZWJ2aWV3LCBPcGVyYS5cbiAgICAgIC8vIFZlcnNpb24gbWF0Y2hlcyBDaHJvbWUvV2ViUlRDIHZlcnNpb24uXG4gICAgICByZXN1bHQuYnJvd3NlciA9ICdjaHJvbWUnO1xuICAgICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICAgIC9DaHJvbShlfGl1bSlcXC8oXFxkKylcXC4vLCAyKTtcbiAgICB9IGVsc2UgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZXMgJiZcbiAgICAgICAgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvRWRnZVxcLyhcXGQrKS4oXFxkKykkLykpIHsgLy8gRWRnZS5cbiAgICAgIHJlc3VsdC5icm93c2VyID0gJ2VkZ2UnO1xuICAgICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICAgIC9FZGdlXFwvKFxcZCspLihcXGQrKSQvLCAyKTtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJlxuICAgICAgICBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BcHBsZVdlYktpdFxcLyhcXGQrKVxcLi8pKSB7IC8vIFNhZmFyaS5cbiAgICAgIHJlc3VsdC5icm93c2VyID0gJ3NhZmFyaSc7XG4gICAgICByZXN1bHQudmVyc2lvbiA9IGV4dHJhY3RWZXJzaW9uKG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAgICAgL0FwcGxlV2ViS2l0XFwvKFxcZCspXFwuLywgMSk7XG4gICAgfSBlbHNlIHsgLy8gRGVmYXVsdCBmYWxsdGhyb3VnaDogbm90IHN1cHBvcnRlZC5cbiAgICAgIHJlc3VsdC5icm93c2VyID0gJ05vdCBhIHN1cHBvcnRlZCBicm93c2VyLic7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn07XG5cbn0se31dfSx7fSxbM10pKDMpXG59KTsiXSwic291cmNlUm9vdCI6IiJ9
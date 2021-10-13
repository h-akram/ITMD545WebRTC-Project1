'use strict';

const $self = {
    rtcConfig: null,
    constraints: { audio: false, video: true },
    isPolite: false,
    isMakingOffer: false,
    isIgnoringOffer: false,
    isSettingRemoteAnswerPending: false
};

const $peer = {
    connection: new RTCPeerConnection($self.rtcConfig)
};

requestUserMedia($self.constraints);

async function requestUserMedia(constraints) {
    const video = document.querySelector('#self');
    $self.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = $self.stream;
}

/**
 * Socket server events and callbacks
 */
const namespace = prepareNamespace(window.location.hash, true);

const sc = io(`/${namespace}`, { autoConnect: false });

registerScEvents();

/* DOM events*/
const button = document.querySelector('#call-button');

/* button.addEventListener('click', function () {
    sc.open();
});*/

button.addEventListener('click', joinCall);


function joinCall() {
    sc.open();
    registerRtcEvents($peer);
    establishCallFeatures($peer);
}

function leaveCall() {
    sc.close();
}

/* WebRTC events */

function establishCallFeatures(peer) {
    peer.connection
        .addTrack($self.stream.getTracks()[0],
            $self.stream);
}

function registerRtcEvents(peer) {
    peer.connection.onnegotiationneeded = handleRtcNegotiation;
    peer.connection.onicecandidate = handleIceCandidate;
    peer.connection.ontrack = handleRtcTrack;
}

async function handleRtcNegotiation() {
    console.log('RTC negotiation needed . . .');
    $self.isMakingOffer = true;
    await $peer.connection.setLocalDescription();
    sc.emit('signal', { description: $peer.connection.localDescription });
    $self.isMakingOffer = false;
}

function handleIceCandidate({ candidate }) {
    sc.emit('signal', { candidate: candidate });
}

function handleRtcTrack() {

}

/* Signaling channel events */

function registerScEvents() {
    sc.on('connect', handleScConnect);
    sc.on('connected peer', handleScConnectedPeer);
    sc.on('signal', handleScSignal);
    sc.on('disconnected peer', handleScDisconnectedPeer);
}

function handleScConnect() {
    console.log('Connected to signaling server.');
}

function handleScConnectedPeer() {
    console.log('Heard a peer connect.');
    $self.isPolite = true;
}

async function handleScSignal({ description, candidate }) {
    console.log('Heard a signal.');
    if (description) {
        console.log('Received SDP signal: ', description);
    }
    else if (candidate) {
        console.log('Received ICE candidate: ', candidate);
    }
}

function handleScDisconnectedPeer() {
    console.log('Heard a peer disconnect.');
}

/**
 *  Utility Functions
 */
function prepareNamespace(hash, set_location) {
    let ns = hash.replace(/^#/, ''); // remove # from the hash
    if (/^[0-9]{6}$/.test(ns)) {
        console.log('Checked existing namespace', ns);
        return ns;
    }
    ns = Math.random().toString().substring(2, 8);
    console.log('Created new namespace', ns);
    if (set_location) window.location.hash = ns;
    return ns;
}

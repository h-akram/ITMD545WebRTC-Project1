'use strict';

const $self = {
    rtcConfig: null,
    constraints: { audio: false, video: true }
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
const namespace = window.location.hash.substr(1);

/* DOM events*/
const button = document.querySelector('#call-button');
const sc = io( `/${namespace}`, { autoConnect: false });
button.addEventListener('click', function() {
    sc.open();
});

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
}

async function handleScSignal() {
    console.log('Heard a signal.');
}

function handleScDisconnectedPeer() {
    console.log('Heard a peer disconnect.');
}

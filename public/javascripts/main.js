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
const namespace = prepareNamespace(window.location.hash, true);

/* DOM events*/
const button = document.querySelector('#call-button');
const sc = io( `/${namespace}`, { autoConnect: false });

registerScEvents();

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

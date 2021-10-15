'use strict';

const $self = {
    rtcConfig: null,
    constraints: { audio: true, video: true },
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
    $self.stream = await navigator.mediaDevices.getUserMedia(constraints);
    displayStream('#self', $self.stream);
    audioStream('#self', $self.stream);
}
/**
 * Socket server events and callbacks
 */
const namespace = prepareNamespace(window.location.hash, true);
const sc = io(`/${namespace}`, { autoConnect: false });

registerScEvents();

/* DOM events*/
const button = document.querySelector('#call-button');
const chatForm = document.querySelector('#chat-form');
const videoControl = document.querySelector('#video-control');
const audioControl = document.querySelector('#audio-control');
const pipVideo = document.querySelector('#peer');
const pipButton = document.querySelector('#pipButton');

pipButton.hidden = !document.pictureInPictureEnabled || pipVideo.disablePictureInPicture;

button.addEventListener('click', handleButton);
chatForm.addEventListener('submit', handleChatForm);
videoControl.addEventListener('click', stopVideo);
audioControl.addEventListener('click', stopAudio);
pipButton.addEventListener('click', pictureInPicture);

document.querySelector('#session-welcome').innerText = `Welcome to Session #${namespace}!`;

function displayStream(selector, stream) {
    const video = document.querySelector(selector);
    video.srcObject = stream;
}

function audioStream(selector, stream) {
    const audio = document.querySelector(selector);
    audio.srcObject = stream;
}

function handleButton(e) {
    const button = e.target;
    if (button.className === 'join-call') {
        button.className = 'leave-call';
        button.innerText = 'Leave';
        joinCall();
    }
    else {
        button.className = 'join-call';
        button.innerText = 'Join'
        leaveCall();
    }
}

function handleChatForm(e) {
    e.preventDefault();
    const form = e.target;
    const input = form.querySelector('#chat-input');
    const message = input.value;

    appendMessage('self', message);
    $peer.chatChannel.send(message);

    console.log('Chat was submitted. Message:', message);
    input.value = '';
}

function appendMessage(sender, message) {
    const log = document.querySelector('#chat-log');
    const li = document.createElement('li');
    li.innerText = message;
    li.className = sender;
    log.appendChild(li);
}

function joinCall() {
    sc.open();
    registerRtcEvents($peer);
    establishCallFeatures($peer);
}

function leaveCall() {
    resetCall($peer);
    displayStream('#peer', null);
    sc.close();
}

function resetCall(peer) {
    displayStream('#peer', null);
    peer.connection.close();
    peer.connection = new RTCPeerConnection($self.rtcConfig);
}

function resetAndRetryConnection(peer) {
    resetCall(peer);

    $self.isMakingOffer = false;
    $self.isIgnoringOffer = false;
    $self.isSettingRemoteAnswerPending = false;
    $self.isSuppressingInitialOffer = $self.isPolite;

    registerRtcEvents(peer);
    establishCallFeatures(peer);
    if ($self.isPolite) {
        sc.emit('signal', { description: {type: '_reset'}});
    }
}

// starting and stopping video
function stopVideo(e) {
    const videoStream = $self.stream.getVideoTracks()[0];
    const videoControl = e.target;
    if (videoControl.className === 'videoOn') {
        videoControl.className = 'videoOff';
        videoControl.innerText = 'Start Video';
        videoStream.enabled = false;
    }
    else {
        videoControl.className = 'videoOn';
        videoControl.innerText = 'Stop Video';
        videoStream.enabled = true;
    }
}

//starting and stopping audio
function stopAudio(e) {
    const audioStream = $self.stream.getAudioTracks()[0];
    const audioControl = e.target;
    if (audioControl.className === 'audioOn') {
        audioControl.className = 'audioOff';
        audioControl.innerText = 'Start Audio';
        audioStream.enabled = false;
    }
    else {
        audioControl.className = 'audioOn';
        audioControl.innerText = 'Stop Audio';
        audioStream.enabled = true;
    }
}

// attempted to use picture in picture API
async function pictureInPicture() {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        }
        else {
            await video.requestPictureInPicture();
        }
    }
    catch (err) {
        console.log('Picture in Picture mode could not be entered.');
    }
}

/* WebRTC events */

function establishCallFeatures(peer) {
    peer.connection.addTrack($self.stream.getTracks()[0], $self.stream);
    peer.chatChannel = peer.connection.createDataChannel(`chat`, { negotiated: true, id: 50 });
    peer.chatChannel.onmessage = function( { data }) {
        appendMessage('peer', data);
    }
}

function registerRtcEvents(peer) {
    peer.connection.onnegotiationneeded = handleRtcNegotiation;
    peer.connection.onicecandidate = handleIceCandidate;
    peer.connection.ontrack = handleRtcTrack;
    peer.connection.ondatachannel = handleRtcDataChannel;
}

async function handleRtcNegotiation() {
    if ($self.isSuppressingInitialOffer) return;
    console.log('RTC negotiation needed...');
    $self.isMakingOffer = true;
    try {
        await $peer.connection.setLocalDescription();
    }
    catch (e) {
        const offer = await $peer.connection.createOffer();
        await $peer.connection.setLocalDescription(offer);
    }
    finally {
        sc.emit('signal', { description: $peer.connection.localDescription });
    }
    $self.isMakingOffer = false;
}

function handleIceCandidate({ candidate }) {
    sc.emit('signal', { candidate: candidate });
}

function handleRtcTrack({ track, streams: [stream] }) {
    displayStream('#peer', stream);
}

function handleRtcDataChannel({ channel }) {
    console.log('Heard data channel event.', channel);
    $peer.testChannel = channel;
    console.log('The label is ', $peer.testChannel.label);
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

        if (description.type === '_reset') {
            resetAndRetryConnection($peer);
            return;
        }

        const readyForOffer =
            !$self.isMakingOffer &&
            ($peer.connection.signalingState === 'stable'
                || $self.isSettingRemoteAnswerPending);

        const offerCollision = description.type === 'offer' && !readyForOffer;

        $self.isIgnoringOffer = !$self.isPolite && offerCollision;

        if ($self.isIgnoringOffer) {
            return;
        }

        $self.isSettingRemoteAnswerPending = description.type === 'answer';
        console.log('Signaling state on incoming description; ', $peer.connection.signalingState);
        try{
            await $peer.connection.setRemoteDescription(description);
        }
        catch(e){
            //$self.isSettingRemoteAnswerPending = false;
            resetAndRetryConnection($peer);
            return;
        }

        if (description.type === 'offer') {
            try { 
                await $peer.connection.setLocalDescription();
            }
            catch (e) {
                const answer = await $peer.connection.createAnswer();
                await $peer.connection.setLocalDescription(answer);
            }
            finally {
                sc.emit('signal', { description: $peer.connection.localDescription });
                $self.isSuppressingInitialOffer = false;
            }
        }
    }
    else if (candidate) {
        console.log('Received ICE candidate:', candidate);
        try {
            await $peer.connection.addIceCandidate(candidate);
        }
        catch(e) {
            if (!self.isIgnoringOffer) {
                console.error('Cannot add ICE candidate for peer ', e);
            }
        }
    }
}

function handleScDisconnectedPeer() {
    console.log('Heard a peer disconnect.');
    resetCall($peer);
    registerRtcEvents($peer);
    establishCallFeatures($peer);
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

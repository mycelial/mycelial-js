import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { WebRTCStar } from '@libp2p/webrtc-star'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'

import * as Mycelial from '@mycelial/core';
import * as Adapter from '@mycelial/libp2p';

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

(async () => {
  const webRtcStar = new WebRTCStar()

  const libp2p = await createLibp2p({
    addresses: {
      listen: [
        '/ip4/127.0.0.1/tcp/13579/ws/p2p-webrtc-star',
      ]
    },
    transports: [
      new WebSockets(),
      webRtcStar
    ],
    connectionEncryption: [new Noise()],
    streamMuxers: [new Mplex()],
    pubsub: new GossipSub(),
    peerDiscovery: [
      webRtcStar.discovery,
    ]
  });

  // Export libp2p to the window so you can play with the API
  window.libp2p = libp2p

  // UI elements
  const status = document.getElementById('status')
  const output = document.getElementById('output')
  const vec = document.getElementById('vec');

  output.textContent = ''

  function log (txt) {
    console.info(txt)
    output.textContent += `${txt.trim()}\n`
  }

  const spore = Mycelial.create('@mycelial', getRandomInt(1000));

  libp2p.connectionManager.addEventListener('peer:connect', (evt) => {
    const connection = evt.detail
    log(`Connected to ${connection.remotePeer.toString()}`)
  })

  libp2p.connectionManager.addEventListener('peer:disconnect', (evt) => {
    const connection = evt.detail
    log(`Disconnected from ${connection.remotePeer.toString()}`)
  })

  spore.subscribe((spore, op, snapshot) => {
    vec.textContent = JSON.stringify(spore.log.to_vec(), null, '  ');
  });

  window.spore = spore;

  status.innerText = 'Mycelial over libp2p pubsub started!'
  log(`Node id is ${libp2p.peerId.toString()}`)

  setInterval(() => {
    vec.textContent = JSON.stringify(spore.log.to_vec(), null, '  ');
  }, 100)

  const adapter = await Adapter.create(libp2p, spore);

  await libp2p.start()
})();
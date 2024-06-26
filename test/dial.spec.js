/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')
const each = require('async/each')
const pull = require('pull-stream')
const Buffer = require('safe-buffer').Buffer

const WebSocketsStar = require('../src')

describe('dial', () => {
  let listeners = []
  let ws1
  let ma1
  // let ma1v6

  let ws2
  let ma2
  let ma2v6

  const peerId1 = 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a'
  const peerId2 = 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b'

  const maDNS = '/dns/ws-star-signal-1.servep2p.com'
  const maDNS6 = '/dns6/ws-star-signal-2.servep2p.com'
  const maRemoteIP4 = '/ip4/148.251.206.162/tcp/9090'
  const maRemoteIP6 = '/ip6/2a01:4f8:212:e0::1/tcp/4287'

  const maLocalIP4 = '/ip4/127.0.0.1/tcp/15001'
  // const maLocalIP6 = '/ip6/::1/tcp/15003'
  const maGen = (base, id) => multiaddr(`/${base}/p2p-websocket-star/ws/ipfs/${id}`)

  if (process.env.REMOTE_DNS) {
    // test with deployed signalling server using DNS
    console.log('Using DNS:', maDNS, maDNS6)
    ma1 = maGen(maDNS, peerId1)
    // ma1v6 = maGen(maDNS6, peerId1)

    ma2 = maGen(maDNS, peerId2)
    ma2v6 = maGen(maDNS6, peerId2)
  } else if (process.env.REMOTE_IP) {
    // test with deployed signalling server using IP
    console.log('Using IP:', maRemoteIP4, maRemoteIP6)
    ma1 = maGen(maRemoteIP4, peerId1)
    // ma1v6 = maGen(maRemoteIP6, peerId1)

    ma2 = maGen(maRemoteIP4, peerId2)
    ma2v6 = maGen(maRemoteIP6, peerId2)
  } else {
    ma1 = maGen(maLocalIP4, peerId1)
    // ma1v6 = maGen(maLocalIP6, peerId1)

    ma2 = maGen(maLocalIP4, peerId2)
    ma2v6 = maGen(maLocalIP4, peerId2)
  }

  before((done) => {
    ws1 = new WebSocketsStar()
    ws2 = new WebSocketsStar()

    each([
      [ws1, ma1],
      [ws2, ma2]
      // [ws1, ma1v6],
      // [ws2, ma2v6]
    ], (i, n) => listeners[listeners.push(i[0].createListener((conn) => pull(conn, conn))) - 1].listen(i[1], n), done)
  })

  it('dial on IPv4, check callback', (done) => {
    ws1.dial(ma2, (err, conn) => {
      expect(err).to.not.exist()

      const data = Buffer.from('some data')

      pull(
        pull.values([data]),
        conn,
        pull.collect((err, values) => {
          expect(err).to.not.exist()
          values[0] = Buffer.from(values[0])
          expect(values).to.eql([data])
          done()
        })
      )
    })
  })

  it('dial offline / non-exist()ent node on IPv4, check callback', (done) => {
    const maOffline = multiaddr('/ip4/127.0.0.1/tcp/40404/ws/p2p-websocket-star/ipfs/ABCD')

    ws1.dial(maOffline, (err) => {
      expect(err).to.exist()
      done()
    })
  })

  it.skip('dial on IPv6, check callback', (done) => {
    ws1.dial(ma2v6, (err, conn) => {
      expect(err).to.not.exist()

      const data = Buffer.from('some data')

      pull(
        pull.values([data]),
        conn,
        pull.collect((err, values) => {
          expect(err).to.not.exist()
          values[0] = Buffer.from(values[0])
          expect(values).to.be.eql([data])
          done()
        })
      )
    })
  })

  after(done => each(listeners, (l, next) => l.close(next), done))
})

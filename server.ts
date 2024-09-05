import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

import { ProtoGrpcType } from './proto/random'
import { RandomHandlers } from './proto/randomPackage/Random'
import { ChatRequest } from './proto/randomPackage/ChatRequest'
import { ChatResponse } from './proto/randomPackage/ChatResponse'

const PORT = 8082
const PROTO_FILE = './proto/random.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType
const randomPackage = grpcObj.randomPackage

function main() {
  const server = getServer()

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err)
      return
    }
    console.log(`Your server as started on port ${port}`)
  })
}

const callObjByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>()

function getServer() {
  const server = new grpc.Server()
  server.addService(randomPackage.Random.service, {
    Chat: (call) => {
      call.on("data", (req) => {
        const username = call.metadata.get('username')[0] as string
        const msg = req.message
        console.log(username, req.message)


        for(let [user, usersCall] of callObjByUsername) {
          if(username !== user) {
            usersCall.write({
              username: username,
              message: msg
            })
          }
        }

        if (callObjByUsername.get(username) === undefined) {
          callObjByUsername.set(username, call)
        }
      })

      call.on("end", () => {
        const username = call.metadata.get('username')[0] as string
        callObjByUsername.delete(username)
        for(let [user, usersCall] of callObjByUsername) {
            usersCall.write({
              username: username,
              message: "Has Left the Chat!"
            })
        }
        console.log(`${username} is ending their chat session`)

        call.write({
          username: "Server",
          message: `See you later ${username}`
        })

        call.end()
      })

    }
  } as RandomHandlers)

  return server
}

main();
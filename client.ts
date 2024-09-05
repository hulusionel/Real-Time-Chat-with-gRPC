import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import {ProtoGrpcType} from './proto/random'
import readline from 'readline'

const PORT = 8082
const PROTO_FILE = './proto/random.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType

const client = new grpcObj.randomPackage.Random(
  `0.0.0.0:${PORT}`, grpc.credentials.createInsecure()
)

const deadline = new Date()
deadline.setSeconds(deadline.getSeconds() + 5)
client.waitForReady(deadline, (err) => {
  if (err) {
    console.error(err)
    return
  }
  onClientReady()
})

function onClientReady() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const username = process.argv[2]
  if (!username) console.error("No username, can't join chat"), process.exit()

  const metadata = new grpc.Metadata()
  metadata.set("username", username)
  const call = client.Chat(metadata)
  
  call.write({
    message: "register"
  })

  call.on("data", (chunk) => {
    console.log(`${chunk.username} ==> ${chunk.message}`)
  })

  rl.on("line", (line) => {
    if(line === "quit") {
      call.end()
    }else {
      call.write({
        message: line
      })
    }

  })
}
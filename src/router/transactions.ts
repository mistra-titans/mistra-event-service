import Elysia from "elysia";
import { consumeTransactionMessage } from "../service/rabbit";

export const transactionRouter = new Elysia({
  prefix: "/transaction",
  tags: ["Transactions"]
})
  .get("/transfer", async () => {
    console.log("I am the transfer route")
    await consumeTransactionMessage()
  }, {
    detail: {
      description: "Listen once"
    }
  })
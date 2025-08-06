require("dotenv").config();
const { Connection, Keypair } = require("@solana/web3.js");
const axios = require("axios");
const { Telegraf } = require("telegraf");

const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(secretKey);
const connection = new Connection(process.env.RPC_ENDPOINT, "confirmed");
const TARGET_TOKEN = process.env.TARGET_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PROFIT_TARGET = parseFloat(process.env.PROFIT_TARGET || "2.0");

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function getQuote(inputMint, outputMint, amount) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippage=1`;
  const response = await axios.get(url);
  return response.data;
}

async function checkSellable(tokenMint) {
  try {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=10000&slippage=5`;
    const res = await axios.get(url);
    return res.data.data && res.data.data.length > 0;
  } catch (e) {
    return false;
  }
}

async function sendTelegramMessage(msg) {
  try {
    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, msg);
  } catch (err) {
    console.error("Telegram message failed:", err.message);
  }
}

async function snipe() {
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  const quote = await getQuote(SOL_MINT, TARGET_TOKEN, 1000000);
  if (!quote?.data?.length) {
    console.log("No quote found.");
    return;
  }

  const sellable = await checkSellable(TARGET_TOKEN);
  if (!sellable) {
    await sendTelegramMessage("❌ RUG ALERT: Token not sellable.");
    return;
  }

  await sendTelegramMessage("🚀 Sniping token...");
  console.log("Simulated buy...");

  const buyPrice = 0.001;
  const targetPrice = buyPrice * PROFIT_TARGET;
  await sendTelegramMessage(`✅ Bought at ${buyPrice} SOL. Auto‑sell at ${targetPrice} SOL.`);

  setTimeout(async () => {
    await sendTelegramMessage(`💰 Target hit! Selling at ${targetPrice} SOL.`);
  }, 10000);
}

snipe().catch(err => {
  console.error(err);
  sendTelegramMessage(`❗ Bot error: ${err.message}`);
});

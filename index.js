const Web3 = require('web3');
const fs = require('fs');

const UNISWAP_PAIR_ABI = require('./uniswapPairABI.json');
const provider = new Web3.providers.WebsocketProvider('wss://mainnet.infura.io/ws/v3/<Project-Id>', {
  clientConfig: {
    maxReceivedFrameSize: 100000000,
    maxReceivedMessageSize: 100000000,
  }
});

const web3 = new Web3(provider);

async function getLatestBlockNumber() {
  const block = await web3.eth.getBlock('latest');
  return block.number;
}
async function getSwapEvents(pairAddress, fromBlock, toBlock) {
  const uniswapPair = new web3.eth.Contract(UNISWAP_PAIR_ABI, pairAddress);
  let swapEvents = [];
  const step = 1000;
  // if you have more than 50k blocks then use the loop to break down into steps
  for (let i = fromBlock; i <= toBlock; i += step) { 
    const events = await uniswapPair.getPastEvents('Swap', { fromBlock: i, toBlock: Math.min(i + step - 1, toBlock) });
    swapEvents = swapEvents.concat(events);
  }

  // Filter the events to find those where someone gives ETH and gets token
  const buys = swapEvents.filter(event => {
    const amount0Out = +event.returnValues.amount0Out;
  const amount1In = +event.returnValues.amount1In;
  if (amount0Out > 0 && amount1In > 0)
    return event ;
  });
  console.log("buys",buys);
  // Get the amounts of Token and ETH exchanged for each buy event
  const buyAmounts = await Promise.all(buys.map(async event => {
    const tokenAmount =  +event.returnValues.amount0Out.toString() / 1e9 // I have 9 decimal token so I divide it into 10^9. if you have 18 decimal then do 1e18
    const ethAmount = +event.returnValues.amount1In.toString()/1e18
    return { token: tokenAmount, eth: ethAmount };
  }));

  return buyAmounts;
}

async function main() {
  const latestBlockNumber = await getLatestBlockNumber();
  //You can change the number of blocks
  const fromBlockNumber = latestBlockNumber - 50000;
  const tokenWethPairAddress = '0xf48621535ec3236EeE4BCb71aA507D5519C010bf';
  const buyAmounts = await getSwapEvents(tokenWethPairAddress, fromBlockNumber, latestBlockNumber);
  console.log(buyAmounts);
}

main();
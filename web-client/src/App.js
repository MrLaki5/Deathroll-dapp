import React, { Component } from "react";
import DeathrollContract from "./contracts/Deathroll.json";
import Web3 from "web3";

import "./App.css";

class App extends Component {
  

  constructor(props) {
    super(props);

    this.state = { storageValue: 0, 
                   web3: null, 
                   accounts: null, 
                   contract: null, 
                   oponent_value: "0x0aC4b491Cb0c9d2a03Bdd4d63fbd89A6f7e177aA", 
                   player_number: "/", 
                   game_contract_address: "", 
                   round_number: 1234, 
                   round_roll: 100, 
                   round_player: 1, 
                   round_salt: 'country roads', 
                   game_status: "ongoing", 
                   show_roll: false, 
                   show_init: true, 
                   roll_history: "" 
                  };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.handleChangeContractAddress = this.handleChangeContractAddress.bind(this);
    this.handleSubmitContractAddress = this.handleSubmitContractAddress.bind(this);
  }

  handleChange(event){
    this.setState({oponent_value: event.target.value});
  }

  handleChangeContractAddress(event) {
    this.setState({game_contract_address: event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();
    try {

      // Load and deploy contract
      let deploy_contract = new this.state.web3.eth.Contract(DeathrollContract.abi);
      let payload = {
        data: DeathrollContract.bytecode,
        arguments: [this.state.oponent_value]
      }

      let parameter = {
          from: this.state.accounts[0],
          gas: this.state.web3.utils.toHex(800000),
          gasPrice: this.state.web3.utils.toHex(this.state.web3.utils.toWei('30', 'gwei'))
      }

      deploy_contract.deploy(payload).send(parameter, (err, transactionHash) => {
        console.log('Transaction Hash :', transactionHash);
      }).on('confirmation', () => {}).then((newContractInstance) => {
          console.log('Deployed Contract Address : ', newContractInstance.options.address);
          this.setState({ contract: newContractInstance, game_contract_address: newContractInstance.options.address });
      })
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  }

  handleSubmitContractAddress(event) {
    event.preventDefault();

    const instance = new this.state.web3.eth.Contract(
      DeathrollContract.abi,
      this.state.game_contract_address
    );

    this.setState({ contract: instance });
  }

  check_game_finish_status = async (winner_address) => {
    var game_status = "game lost"
    if (winner_address === this.state.accounts[0])
    {
      game_status = "game won"
    }
    this.setState({ game_status: game_status })
  }

  check_round_info = async () => {
    const round_roll_curr = await this.state.contract.methods.get_round_roll().call()
    var roll_history = ""
    if (round_roll_curr != 100) {
      roll_history = this.state.roll_history + " P" + this.state.round_player + ": " + round_roll_curr
    }
    const round_player_curr = await this.state.contract.methods.get_round_player().call()
    if (round_player_curr == this.state.player_number) {
      this.setState({show_roll: true})
    }
    this.setState({ round_roll: round_roll_curr, round_player: round_player_curr, roll_history: roll_history })
    console.log("ROUND BIG ROLL: " + round_roll_curr)
    console.log("ROUND BIG PLAYER: " + round_player_curr)
  }

  generate_roll = async () => {
    this.setState({show_roll: false})

    await this.state.contract.methods.roll().send({ from: this.state.accounts[0] });
  }

  init_game_function = async () => {
    console.log("Init game function!")

    const current_player_number = await this.state.contract.methods.get_current_player(this.state.accounts[0]).call()

    this.state.contract.events.allEvents({fromBlock: 0}, (error, event) => {
      console.log(event); // same results as the optional callback above
      console.log("ROLLL: " + event.event)

      if (event.event === "Roll_time") {
        this.check_round_info();
      }
      else if (event.event === "Game_finished") {
        this.check_game_finish_status(event.returnValues.winner_address)
      }
    })

    await this.state.contract.methods.init_ready().send({ from: this.state.accounts[0] });

    this.setState({show_init: false, player_number: current_player_number})
  }

  componentDidMount = async () => {
    try {
      if (window.ethereum) {
        // Get network provider and web3 instance.
        const web3 = new Web3(window.ethereum);

        //await window.ethereum.enable();

        // Use web3 to get the user's accounts.
        const accounts = await web3.eth.getAccounts();

        this.setState({ web3, accounts});
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  render() {
    if (!this.state.contract) {
      return (
        <div>
          Create game: <br/>
          <form onSubmit={this.handleSubmit}>
            <label>
              Oponnent public address:<br/>
              <textarea value={this.state.oponent_value} onChange={this.handleChange} /> <br/>
            </label>
            <input type="submit" value="Create"/>
          </form>

          <hr/>

          Join game: <br/>
          <form onSubmit={this.handleSubmitContractAddress}>
            <label>
              Game contract address:<br/>
              <textarea value={this.state.game_contract_address} onChange={this.handleChangeContractAddress} /> <br/>
            </label>
            <input type="submit" value="Join"/>
          </form>
        </div>
      );
    }
    return (
      <div className="App">
        <div>
          Game contract address: {this.state.game_contract_address} <br/>
          You are player: {this.state.player_number} <br/>
          Round roll: {this.state.round_roll} <br/>
          Current responsible player: {this.state.round_player} <br/>
          Game status: {this.state.game_status}
        </div>
        <div>
          Roll history: {this.state.roll_history}
        </div>
        <button onClick={this.init_game_function} style={this.state.show_init ?  {}: {display: 'none'}}>
          Init game
        </button>
        <button onClick={this.generate_roll} style={this.state.show_roll ?  {}: {display: 'none'}}>
          Roll
        </button>
      </div>
    );
  }
}

export default App;

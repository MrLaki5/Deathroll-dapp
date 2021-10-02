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
                   oponent_value: "0x620799d28dEab551A322AB55943DE1a58e487A37", 
                   player_number: "/", 
                   game_contract_address: "", 
                   round_number: 1234, 
                   round_roll: 100, 
                   round_player: 1, 
                   round_salt: 'country roads', 
                   game_status: "ongoing", 
                   show_roll: false, 
                   show_init: false,
                   show_withdraw: false,
                   roll_history: "",
                   participation_value: "",
                   participation_value_wei: ""
                  };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.handleChangeContractAddress = this.handleChangeContractAddress.bind(this);
    this.handleSubmitContractAddress = this.handleSubmitContractAddress.bind(this);
    this.handleChangeParticipation = this.handleChangeParticipation.bind(this);
  }

  handleChange(event){
    this.setState({oponent_value: event.target.value});
  }

  handleChangeContractAddress(event) {
    this.setState({game_contract_address: event.target.value});
  }

  handleChangeParticipation(event) {
    this.setState({participation_value: event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();
    try {
      this.state.participation_value_wei = this.state.web3.utils.toWei(this.state.participation_value.toString(), "ether")

      // Load and deploy contract
      let deploy_contract = new this.state.web3.eth.Contract(DeathrollContract.abi);
      let payload = {
        data: DeathrollContract.bytecode,
        arguments: [this.state.oponent_value, this.state.participation_value_wei]
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
          this.setState({ contract: newContractInstance, game_contract_address: newContractInstance.options.address }, () => this.load_state_function());
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

    this.setState({ contract: instance }, () => this.load_state_function());
  }

  check_game_finish_status = async (winner_address) => {
    this.check_roll_history();
    var game_status = "game lost"
    if (winner_address === this.state.accounts[0])
    {
      game_status = "game won"
      const can_withdraw = await this.state.contract.methods.can_withdraw().call({ from: this.state.accounts[0] })
      if (can_withdraw) {
        this.setState({show_withdraw: true})
      }
    }
    this.setState({ game_status: game_status })
  }

  check_roll_history = async () => {
    const roll_history = await this.state.contract.methods.get_roll_history().call()
    var index_roll_player = await this.state.contract.methods.get_first_to_play().call()

    var roll_history_string = ""
    for (var i = 0; i < roll_history.length; i++) {
        roll_history_string += " P" + index_roll_player + ": " + roll_history[i];
        index_roll_player = (index_roll_player == 1) ? 2 : 1;
    }

    this.setState({ roll_history: roll_history_string })
  }

  check_round_info = async () => {
    const round_roll_curr = await this.state.contract.methods.get_round_roll().call()
    const round_player_curr = await this.state.contract.methods.get_round_player().call()
    this.check_roll_history();
    if (round_player_curr == this.state.player_number) {
      this.setState({show_roll: true})
    }
    this.setState({ round_roll: round_roll_curr, round_player: round_player_curr })
    console.log("ROUND BIG ROLL: " + round_roll_curr)
    console.log("ROUND BIG PLAYER: " + round_player_curr)
  }

  generate_roll = async () => {
    this.setState({show_roll: false})

    await this.state.contract.methods.roll().send({ from: this.state.accounts[0] });
  }

  load_state_function = async () => {
    var games_history = JSON.parse(localStorage.getItem("game_history"));
    if (games_history != null)
    {
      if(games_history.indexOf(this.state.game_contract_address) === -1) 
      {
        games_history = [this.state.game_contract_address].concat(games_history);
        if (games_history.length > 5) {
          games_history.length = 5;
        }
        localStorage.setItem("game_history", JSON.stringify(games_history));
      }
    }
    else
    {
      games_history = [this.state.game_contract_address]
      localStorage.setItem("game_history", JSON.stringify(games_history));
    }

    const current_player_number = await this.state.contract.methods.get_current_player(this.state.accounts[0]).call()
    const participation_value_wei = await this.state.contract.methods.get_minimum_value().call()
    this.setState({player_number: current_player_number, participation_value_wei: participation_value_wei})

    const round_state = await this.state.contract.methods.get_round_state().call()

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

    if (round_state == 0) {
      this.setState({show_init: true})
    }
    else if (round_state == current_player_number) {
      this.check_round_info();
    }
    else if (round_state == 3) {

    }
  }

  init_game_function = async () => {
    console.log("Init game function!")
    this.setState({show_init: false})
    await this.state.contract.methods.init_ready().send({ from: this.state.accounts[0], value: this.state.participation_value_wei });
  }

  withdraw = async () => {
    this.setState({show_withdraw: false})
    await this.state.contract.methods.withdraw().send({ from: this.state.accounts[0] });
  }

  componentDidMount = async () => {
    try {
      if (window.ethereum) {
        // Get network provider and web3 instance.
        const web3 = new Web3(window.ethereum);

        await window.ethereum.enable();

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
      var games_history = JSON.parse(localStorage.getItem("game_history"));
      let content = [];
      if (games_history !== null) {
        games_history.forEach((game, i) => {
          content.push(<div key={i}>{game}<br/></div>)
        })
      }
      
      return (
        <div>
          Create game: <br/>
          <form onSubmit={this.handleSubmit}>
            <label>
              Oponnent public address:<br/>
              <textarea value={this.state.oponent_value} onChange={this.handleChange} required/> <br/>
              Participation price:<br/>
              <input type="number" value={this.state.participation_value} onChange={this.handleChangeParticipation} required/> <br/>
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

          <hr/>

          Previous 5 games: <br/>
          {content}

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
        <button onClick={this.withdraw} style={this.state.show_withdraw ?  {}: {display: 'none'}}>
          Withdraw prize
        </button>
      </div>
    );
  }
}

export default App;

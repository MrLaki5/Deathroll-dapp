import React, { Component } from "react";
import DeathrollContract from "./contracts/Deathroll.json";
import Web3 from "web3";

import "./App.css";

class App extends Component {
  

  constructor(props) {
    super(props);

    this.state = { storageValue: 0,
                   version: "v0.1",
                   web3: null, 
                   accounts: null, 
                   contract: null, 
                   oponent_value: "", 
                   player_number: "/", 
                   game_contract_address: "", 
                   round_number: 1234, 
                   round_roll: 100, 
                   round_player: 1,
                   game_status: "Ongoing", 
                   show_roll: false, 
                   show_init: false,
                   show_withdraw: false,
                   roll_history: "",
                   participation_value: "",
                   participation_value_wei: "",
                   last_action_time: "",
                   game_expired_address: "",
                   error_message: "",
                   starting_roll_value: 100,
                   first_to_play: 1
                  };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.handleChangeContractAddress = this.handleChangeContractAddress.bind(this);
    this.handleSubmitContractAddress = this.handleSubmitContractAddress.bind(this);
    this.handleChangeParticipation = this.handleChangeParticipation.bind(this);
    this.handleChangeExpiredAddress = this.handleChangeExpiredAddress.bind(this);
    this.handleSubmitExpiredAddress = this.handleSubmitExpiredAddress.bind(this);
    this.handleChangeStartingRoll = this.handleChangeStartingRoll.bind(this)
    this.onFirstToPlayChange = this.onFirstToPlayChange.bind(this)
  }

  onFirstToPlayChange(event) {
    this.setState({first_to_play: Number(event.target.value)})
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

  handleChangeExpiredAddress(event) {
    this.setState({game_expired_address: event.target.value});
  }

  handleLeaveRoom = async () => {
    this.setState({contract: null,
                   game_expired_address: "",
                   error_message: "",
                   oponent_value: "",
                   participation_value: "",
                   participation_value_wei: "",
                   game_contract_address: "",
                   starting_roll_value: 100,
                   first_to_play: 1
    })
  }

  handleChangeStartingRoll(event) {
    this.setState({starting_roll_value: event.target.value})
  }

  handleSubmit(event) {
    event.preventDefault();
    try {
      this.setState({error_message: ""})
      // Load and deploy contract
      let deploy_contract = new this.state.web3.eth.Contract(DeathrollContract.abi);
      let payload = {
        data: DeathrollContract.bytecode,
        arguments: [this.state.oponent_value, 
                    this.state.web3.utils.toWei(this.state.participation_value.toString(), "ether"),
                    this.state.starting_roll_value,
                    this.state.first_to_play]
      }

      let parameter = {
          from: this.state.accounts[0],
          gas: this.state.web3.utils.toHex(1000000),
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
      this.setState({error_message: "There was problem with creating a game contract."})
    }
  }

  handleSubmitContractAddress(event) {
    event.preventDefault();
    try {
      this.setState({error_message: ""})
      if (this.state.web3.utils.isAddress(this.state.game_contract_address)) {
        const instance = new this.state.web3.eth.Contract(
          DeathrollContract.abi,
          this.state.game_contract_address
        );

        this.setState({ contract: instance }, () => this.load_state_function());
      }
      else {
        this.setState({error_message: "Invalid game address."})
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There is error joining a game."})
    }
  }

  handleSubmitExpiredAddress(event) {
    event.preventDefault();
    this.expire_withdraw();
  }

  expire_withdraw = async () => {
    try {
      this.setState({error_message: ""})
      if (this.state.web3.utils.isAddress(this.state.game_expired_address)) {
        const instance = new this.state.web3.eth.Contract(
          DeathrollContract.abi,
          this.state.game_expired_address
        );

        await instance.methods.expire_withdraw().send({ from: this.state.accounts[0] })
      }
      else {
        this.setState({error_message: "Invalid game address."})
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There is error requesting expired withdrawal."})
    }
  }

  check_game_finish_status = async (winner_address) => {
    this.check_roll_history();
    var game_status = "Game lost"
    if (winner_address === this.state.accounts[0])
    {
      game_status = "Game won"
      const can_withdraw = await this.state.contract.methods.can_withdraw().call({ from: this.state.accounts[0] })
      if (can_withdraw) {
        this.setState({show_withdraw: true})
      }
    }
    this.setState({ game_status: game_status })
  }

  check_game_expired_status = async (winner_address) => {
    this.check_roll_history();
    var game_status = "Game lost (Expired)"
    if (winner_address === this.state.accounts[0])
    {
      game_status = "Game won (Expired)"
    }
    this.setState({ game_status: game_status })
  }

  check_roll_history = async () => {
    const roll_history = await this.state.contract.methods.get_roll_history().call()
    var index_roll_player = await this.state.contract.methods.get_first_to_play().call()

    var roll_history_string = ""
    for (var i = 0; i < roll_history.length; i++) {
        roll_history_string += " P" + index_roll_player + ": " + roll_history[i];
        index_roll_player = (Number(index_roll_player) === 1) ? 2 : 1;
    }

    this.setState({ roll_history: roll_history_string })
  }

  check_round_info = async () => {
    const round_roll_curr = await this.state.contract.methods.get_round_roll().call()
    const round_player_curr = await this.state.contract.methods.get_round_player().call()
    const last_action_time = await this.state.contract.methods.get_last_action_time().call()
    this.check_roll_history();
    this.setState({ round_roll: round_roll_curr, round_player: round_player_curr, last_action_time: last_action_time })
  }

  check_is_roll_time = async () => {
    await this.check_round_info()
    if (Number(this.state.round_player) === Number(this.state.player_number)) {
      this.setState({show_roll: true})
    }
  }

  generate_roll = async () => {
    try {
      this.setState({show_roll: false, error_message: ""})

      await this.state.contract.methods.roll().send({ from: this.state.accounts[0] });
    }
    catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There was error rolling.", show_roll: true})
    }
  }

  load_state_function = async () => {
    try {
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
      this.setState({player_number: current_player_number, participation_value_wei: participation_value_wei, error_message: "", game_status: "Ongoing"})

      const round_state = Number(await this.state.contract.methods.get_round_state().call());

      this.state.contract.events.allEvents({fromBlock: 0}, (error, event) => {
        console.log(event); // same results as the optional callback above
        console.log("ROLLL: " + event.event)

        if (event.event === "Roll_time") {
          this.check_is_roll_time();
          console.log("Round player: " + this.state.round_player)
          console.log("CURR player: " + this.state.player_number)
          
        }
        else if (event.event === "Game_finished") {
          this.check_game_finish_status(event.returnValues.winner_address)
        }
        else if (event.event === "Expired_withdraw") {
          this.check_game_expired_status(event.returnValues.winner_address)
        }
      })

      if (round_state === 0) {
        this.check_round_info()
        const init_status = await this.state.contract.methods.get_init_status().call({ from: this.state.accounts[0] })
        if (!init_status) {
          this.setState({show_init: true})
        }
      }
      else if (round_state === current_player_number) {
        this.check_is_roll_time();
        if (Number(this.state.round_player) === Number(this.state.player_number)) {
          this.setState({show_roll: true})
        }
      }
      else if (round_state === 3) {

      }
      else if (round_state === 4) {

      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There was error loading game content."})
    }
  }

  init_game_function = async () => {
    try {
      this.setState({show_init: false, error_message: ""})
      await this.state.contract.methods.init_ready().send({ from: this.state.accounts[0], value: this.state.participation_value_wei });
      this.check_round_info();
    }
    catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There was error initializing game.", show_init: true})
    }
  }

  withdraw = async () => {
    try {
      this.setState({show_withdraw: false, error_message: ""})
      await this.state.contract.methods.withdraw().send({ from: this.state.accounts[0] });
    }
    catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There was error withdrawing prize.", show_withdraw: true})
    }
  }

  componentDidMount = async () => {
    try {
      this.setState({error_message: ""})
      if (window.ethereum) {
        // Get network provider and web3 instance.
        const web3 = new Web3(window.ethereum);

        await window.ethereum.enable();

        // Use web3 to get the user's accounts.
        const accounts = await web3.eth.getAccounts();

        this.setState({ web3, accounts});
      }
      else {
        this.setState({error_message: "Metamask extension not found in Your browser, be sure to have it in order to use this app."});
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({error_message: "There was problem connecting with Your Metamask wallet, make sure everything is correctly set up."});
    }
  };

  formatDateTime(input) {
    var date = new Date(0);
    date.setUTCSeconds(parseInt(input));
    console.log(date)
    //return date.toLocaleString()
    return  date.getHours() + ":" + date.getMinutes() + " " + date.getDate()  + "." + (date.getMonth()+1) + "." + date.getFullYear();
  }

  render() {

    var error_content = ""
    if (this.state.error_message !== "") {
      error_content = (
      <div className="row">
        <div className="col">
          <div className="alert alert-danger" role="alert">
            {this.state.error_message}
          </div>
        </div>
      </div>);
    }

    if (!this.state.contract) {
      var games_history = JSON.parse(localStorage.getItem("game_history"));
      let content = [];
      if (games_history !== null) {
        games_history.forEach((game, i) => {
          content.push(<li className="list-group-item list-group-item-light table-color" key={i}>{game}</li>)
        })
      }
      
      return (
        <div>
          <div className="container image-container spacer">
            <img src="/background.jpg" className="img-fluid image-fix-height-250 unselectable" alt="..."/>
            <div className="centered"><h2 className="title-style unselectable">Deathroll</h2></div>
            <div className="author-place"><small className="title-style unselectable">{this.state.version}</small></div>
          </div>

          <div className="container spacer">

            {error_content}

            <div className="row">
              <div className="col inner-col-class">
                  <h4 className="title-style">Create game</h4>
                  <form onSubmit={this.handleSubmit} autoComplete="off">
                    <div className="mb-3">
                      <label htmlFor="game_expired_address" className="form-label">Oponnent public address</label>
                      <input type="text" className="form-control" id="game_expired_address" aria-describedby="game_expired_address_help" value={this.state.oponent_value} onChange={this.handleChange} required/>
                      <div id="game_expired_address_help" className="form-text">Opponents public wallet address</div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="game_expired_address" className="form-label">Participation price</label>
                      <input type="number" className="form-control" id="game_expired_address" aria-describedby="game_expired_address_help" value={this.state.participation_value} onChange={this.handleChangeParticipation} required/>
                      <div id="game_expired_address_help" className="form-text">Participation price players have to pay to play, which summed will be delivered to game winner</div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="game_expired_address" className="form-label">Starting roll</label>
                      <input type="number" max="1000" min="2" step="1" className="form-control" id="starting_roll" aria-describedby="starting_roll_help" value={this.state.starting_roll_value} onChange={this.handleChangeStartingRoll} required/>
                      <div id="starting_roll_help" className="form-text">Starting roll is number between 2-1000 which is used in first roll of the game</div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="game_expired_address" className="form-label">First to play</label>
                      <div>
                        <div className="form-check form-check-inline" aria-describedby="player_roll_help">
                          <input className="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1" value="1" onChange={this.onFirstToPlayChange} checked={this.state.first_to_play === 1}/>
                          <label className="form-check-label" htmlFor="inlineRadio1">Player 1</label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input className="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio2" value="2" onChange={this.onFirstToPlayChange} checked={this.state.first_to_play === 2}/>
                          <label className="form-check-label" htmlFor="inlineRadio2">Player 2</label>
                        </div>
                      </div>
                      <div id="player_roll_help" className="form-text">First to play and do the roll: player1 (You) or player2 (Oponnent)</div>
                    </div>

                    <div className="mb-3">
                      <input type="submit" className="btn btn-outline-danger" value="Create"/>
                    </div>
                  </form>
              </div>

              <div className="col inner-col-class">
                <h4 className="title-style">Join game</h4>
                <form onSubmit={this.handleSubmitContractAddress} autoComplete="off">
                  <div className="mb-3">
                    <label htmlFor="game_expired_address" className="form-label">Game contract address</label>
                    <input type="text" className="form-control" id="game_expired_address" aria-describedby="game_expired_address_help" value={this.state.game_contract_address} onChange={this.handleChangeContractAddress} required/>
                    <div id="game_expired_address_help" className="form-text">Address of game contract where You want to join </div>
                  </div>
                  <div className="mb-3">
                    <input type="submit" className="btn btn-outline-danger" value="Join"/>
                  </div>
                </form>
              </div>

              <div className="col inner-col-class">
                <h4 className="title-style">Expired withdraw</h4>
                  <form onSubmit={this.handleSubmitExpiredAddress} autoComplete="off">
                    <div className="mb-3">
                      <label htmlFor="game_expired_address" className="form-label">Game contract address</label>
                      <input type="text" className="form-control" id="game_expired_address" aria-describedby="game_expired_address_help" value={this.state.game_expired_address} onChange={this.handleChangeExpiredAddress} required/>
                      <div id="game_expired_address_help" className="form-text">Address of game contract where You want to use expired withdraw </div>
                    </div>
                    <div className="mb-3">
                      <input type="submit" className="btn btn-outline-danger" value="Withdraw"/>
                    </div>
                </form>
              </div>
            </div>

            <div className="row text-center inner-col-class-full-row">
              <h4 className="title-style">Previous 5 games</h4>
              <ul className="list-group list-group-flush text-center">
                {content}
              </ul>
            </div>

          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="container image-container spacer">
          <img src="/background.jpg" className="img-fluid image-fix-height-250 unselectable" alt="..."/>
          <div className="centered"><h2 className="title-style unselectable">Deathroll</h2></div>
          <div className="author-place"><small className="title-style unselectable">{this.state.version}</small></div>
        </div>

        <div className="container spacer">

          {error_content}

          <div className="row text-center inner-col-class-full-row">
            <h4 className="title-style">Game info</h4>
            <ul className="list-group list-group-flush text-center">
              <li className="list-group-item list-group-item-light table-color" key={0}><div id="help_0" className="form-text">Game contract address</div><label aria-describedby="help_0"><b>{this.state.game_contract_address}</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={1}><div id="help_0" className="form-text">Game status</div><label aria-describedby="help_0"><b>{this.state.game_status}</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={2}><div id="help_0" className="form-text">Participation price</div><label aria-describedby="help_0"><b>{this.state.web3.utils.fromWei(this.state.participation_value_wei, "ether")}ETH</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={3}><div id="help_0" className="form-text">Last action time</div><label aria-describedby="help_0"><b>{this.formatDateTime(this.state.last_action_time)}</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={4}><div id="help_0" className="form-text">You are player</div><label aria-describedby="help_0"><b>{this.state.player_number}</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={5}><div id="help_0" className="form-text">Round rolling player</div><label aria-describedby="help_0"><b>{Number(this.state.round_player) === 88? "/" : this.state.round_player}</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={6}><div id="help_0" className="form-text">Round roll</div><label aria-describedby="help_0"><b>{this.state.round_roll}</b></label></li>
              <li className="list-group-item list-group-item-light table-color" key={7}><div id="help_0" className="form-text">Roll history</div><label aria-describedby="help_0"><b>{this.state.roll_history}</b></label></li>
            </ul>
          </div>

          <div className="row text-center inner-col-class-full-row spacer">
            <h4 className="title-style">Game actions</h4>
            <button className="btn btn-outline-danger" onClick={this.init_game_function} style={this.state.show_init ?  {}: {display: 'none'}}>
              Init game
            </button>
            <button className="btn btn-outline-danger" onClick={this.generate_roll} style={this.state.show_roll ?  {}: {display: 'none'}}>
              Roll
            </button>
            <button className="btn btn-outline-danger" onClick={this.withdraw} style={this.state.show_withdraw ?  {}: {display: 'none'}}>
              Withdraw prize
            </button>
          </div>

          <div className="row text-center spacer-up">
            <button className="remove_button_css" onClick={this.handleLeaveRoom}>
              <u>Leave room</u>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default App;

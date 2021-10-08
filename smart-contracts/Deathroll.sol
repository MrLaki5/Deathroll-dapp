// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;


contract Deathroll {

  address private owner;
  address private oponent;
  address private winner;
  bool private action_player1 = false;
  bool private action_player2 = false;

  uint private round_roll = 100;
  uint private minimum_amount;
  uint private last_action_time;
  uint[] private roll_history;

  enum GameState{
    INIT, 
    ROLL_P1, 
    ROLL_P2,
    FIN,
    EXPIRED
  }

  GameState private game_state = GameState.INIT;
  GameState private first_to_play = GameState.ROLL_P1;

  constructor(address _oponent, uint _minimum_amount, uint _start_roll) {
      owner = msg.sender;
      oponent = _oponent;
      minimum_amount = _minimum_amount;
      last_action_time = block.timestamp;
      round_roll = _start_roll;
  }

  event Roll_time(address roll_address);
  event Game_finished(address winner_address);
  event Expired_withdraw(address winner_address);

  modifier onlyPlayers() { require(msg.sender == owner || msg.sender == oponent); _; }
  modifier checkMinimumValue() { require(msg.value >= minimum_amount); _; }
  modifier initState() { require(game_state == GameState.INIT); _; }
  modifier rollState() { require((msg.sender == owner && game_state == GameState.ROLL_P1) || (msg.sender == oponent && game_state == GameState.ROLL_P2)); _; }
  modifier winnerWithdraw() { require(game_state == GameState.FIN && msg.sender == winner && address(this).balance > 0); _; }
  modifier expiredWithdraw() { require((block.timestamp - last_action_time) / 3600 > 2 && address(this).balance > 0); _; }

  function get_round_player() public view returns (uint) {
    if (game_state == GameState.ROLL_P1) {
      return 1;
    }
    else if (game_state == GameState.ROLL_P2) {
      return 2;
    }
    else {
      return 88;
    }
  }

  function get_init_status() public view returns (bool) {
    if (msg.sender == owner && action_player1) {
      return true;
    }
    else if (msg.sender == oponent && action_player2) {
      return true;
    }
    else {
      return false;
    }
  }

  function get_round_roll() public view returns (uint) {
    return round_roll;
  }

  function get_round_state() public view returns (uint) {
    if (game_state == GameState.INIT) {
      return 0;
    }
    else if (game_state == GameState.ROLL_P1) {
      return 1;
    }
    else if (game_state == GameState.ROLL_P2) {
      return 2;
    }
    else if (game_state == GameState.FIN) {
      return 3;
    }
    else {
      return 4;
    }
  }

  function get_current_player(address curr_address) public view returns (uint) {
    if (curr_address == owner) {
      return 1;
    }
    else if (curr_address == oponent) {
      return 2;
    }
    else {
      return 89;
    }
  }

  function get_roll_history() public view returns (uint[] memory) {
    return roll_history;
  }

  function get_first_to_play() public view returns (uint) {
    if (first_to_play == GameState.INIT) {
      return 0;
    }
    else if (first_to_play == GameState.ROLL_P1) {
      return 1;
    }
    else if (first_to_play == GameState.ROLL_P2) {
      return 2;
    }
    else {
      return 3;
    }
  }

  function get_minimum_value() public view returns (uint) {
    return minimum_amount;
  }

  function get_last_action_time() public view returns (uint) {
    return last_action_time;
  }

  function can_withdraw() public view returns (bool) {
    return game_state == GameState.FIN && msg.sender == winner && address(this).balance > 0;
  }

  function init_ready() public payable onlyPlayers initState checkMinimumValue {
    if (msg.sender == owner && !action_player1) {
      last_action_time = block.timestamp;
      action_player1 = true;
    }

    if (msg.sender == oponent && !action_player2) {
      last_action_time = block.timestamp;
      action_player2 = true;
    }

    if (action_player1 && action_player2) {
      game_state = first_to_play;
      if (game_state == GameState.ROLL_P1) {
        emit Roll_time(owner);
      }
      else {
        emit Roll_time(oponent);
      }
    }
  }

  function roll() public onlyPlayers rollState {
    round_roll = (uint(uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)))) % (round_roll - 1)) + 1;
    roll_history.push(round_roll);
    last_action_time = block.timestamp;
    if (round_roll == 1) {
      if (game_state == GameState.ROLL_P1) {
        winner = oponent;
      }
      else {
        winner = owner;
      }
      emit Game_finished(winner);
      game_state = GameState.FIN;
    }
    else {
      if (game_state == GameState.ROLL_P1) {
        game_state = GameState.ROLL_P2;
        emit Roll_time(oponent);
      }
      else {
        game_state = GameState.ROLL_P1;
        emit Roll_time(owner);
      }
    }
  }

  function withdraw() winnerWithdraw public {
    uint256 balance = address(this).balance;
    payable(winner).transfer(balance);
  }

  function expire_withdraw() onlyPlayers expiredWithdraw public {
    bool should_withdraw = false;
    address withdraw_address;
    if (game_state == GameState.INIT && action_player1 ) {
      should_withdraw = true;
      withdraw_address = owner;
    }
    else if (game_state == GameState.INIT && !action_player1 && action_player2 && msg.sender == oponent) {
      should_withdraw = true;
      withdraw_address = oponent;
    }
    else if (game_state == GameState.ROLL_P1 && msg.sender == oponent) {
      should_withdraw = true;
      withdraw_address = oponent;
    }
    else if (game_state == GameState.ROLL_P2 && msg.sender == owner) {
      should_withdraw = true;
      withdraw_address = owner;
    }
    if (should_withdraw) {
      winner = withdraw_address;
      payable(winner).transfer(address(this).balance);
      game_state = GameState.EXPIRED;
      emit Expired_withdraw(winner);
    }
  }
}

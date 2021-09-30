// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21;


contract Deathroll {

  address public owner;
  address public oponent;
  bool action_player1 = false;
  bool action_player2 = false;

  uint round_roll = 100;

  enum GameState{
    INIT, 
    ROLL_P1, 
    ROLL_P2,
    FIN
  }

  GameState game_state = GameState.INIT;
  GameState first_to_play = GameState.ROLL_P1;

  constructor(address _oponent) {
      owner = msg.sender;
      oponent = _oponent;
  }

  event Roll_time(address roll_address);
  event Game_finished(address winner_address);

  modifier onlyPlayers() { require(msg.sender == owner || msg.sender == oponent); _; }
  modifier initState() { require(game_state == GameState.INIT); _; }
  modifier rollState() { require((msg.sender == owner && game_state == GameState.ROLL_P1) || (msg.sender == oponent && game_state == GameState.ROLL_P2)); _; }

  function get_round_player() public view returns (uint) {
    if (game_state == GameState.ROLL_P1) {
      return 1;
    }
    else if (game_state == GameState.ROLL_P2) {
      return 2;
    }
    else {
      return 0;
    }
  }

  function get_round_roll() public view returns (uint) {
    return round_roll;
  }

  function get_current_player(address curr_address) public view returns (uint) {
    if (curr_address == owner) {
      return 1;
    }
    else if (curr_address == oponent) {
      return 2;
    }
    else {
      return 0;
    }
  }

  function init_ready() public onlyPlayers initState {
    if (msg.sender == owner) {
      action_player1 = true;
    }

    if (msg.sender == oponent) {
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

    if (round_roll == 1) {
      if (game_state == GameState.ROLL_P1) {
        emit Game_finished(oponent);
      }
      else {
        emit Game_finished(owner);
      }
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
}

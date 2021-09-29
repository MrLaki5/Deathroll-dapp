// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21;


contract Deathroll {

  address public owner;
  address public oponent;
  bool action_player1 = false;
  bool action_player2 = false;

  bytes32 blind_roll_player1;
  bytes32 blind_roll_player2;
  uint roll_player1;
  uint roll_player2;

  uint round_roll = 100;

  enum GameState{
    INIT, 
    ROLL_P1, 
    ROLL_P2, 
    REV_P1, 
    REV_P2, 
    FIN
  }

  GameState game_state = GameState.INIT;
  GameState first_to_play = GameState.ROLL_P1;

  constructor(address _oponent) {
      owner = msg.sender;
      oponent = _oponent;
  }

  event Roll_time();
  event Reveil_roll_time();
  event Game_finished(address winner_address);

  modifier onlyPlayers() { require(msg.sender == owner || msg.sender == oponent); _; }
  modifier initState() { require(game_state == GameState.INIT); _; }
  modifier rollState() { require(game_state == GameState.ROLL_P1 || game_state == GameState.ROLL_P2); _; }
  modifier revState() { require(game_state == GameState.REV_P1 || game_state == GameState.REV_P2); _; }

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
    if (action_player1 && action_player2) {
      return;
    }
    
    if (msg.sender == owner) {
      action_player1 = true;
    }

    if (msg.sender == oponent) {
      action_player2 = true;
    }

    if (action_player1 && action_player2) {
      action_player2 = false;
      action_player1 = false;
      game_state = first_to_play;
      emit Roll_time();
    }
  }

  function roll(bytes32 _blind_roll) public onlyPlayers rollState {
    if (action_player1 && action_player2) {
      return;
    }

    if (msg.sender == owner) {
      action_player1 = true;
      blind_roll_player1 = _blind_roll;
    }

    if (msg.sender == oponent) {
      action_player2 = true;
      blind_roll_player2 = _blind_roll;
    }

    if (action_player1 && action_player2) {
      action_player2 = false;
      action_player1 = false;
      if (game_state == GameState.ROLL_P1) {
        game_state = GameState.REV_P1;
      }
      else {
        game_state = GameState.REV_P2;
      }
      emit Reveil_roll_time();
    }
  }

  function reveil_roll(uint _value, bytes32 _secret) public onlyPlayers revState {
    if (action_player1 && action_player2) {
      return;
    }

    if (msg.sender == owner) {
      if (blind_roll_player1 == keccak256(abi.encodePacked(_value, _secret))) {
        action_player1 = true;
        roll_player1 = _value;
      }
    }

    if (msg.sender == oponent) {
      action_player2 = true;
      roll_player2 = _value;
    }

    if (action_player1 && action_player2) {
      action_player2 = false;
      action_player1 = false;

      uint current_roll = ((roll_player1 ^ roll_player2) % (round_roll - 1)) + 1;

      if (current_roll == 1) {
        if (game_state == GameState.REV_P1) {
          emit Game_finished(oponent);
        }
        else {
          emit Game_finished(owner);
        }
        game_state = GameState.FIN;
      }
      else {
        if (game_state == GameState.REV_P1) {
          game_state = GameState.ROLL_P2;
        }
        else {
          game_state = GameState.ROLL_P1;
        }
        round_roll = current_roll;
        emit Roll_time();
      }
    }
  }
}

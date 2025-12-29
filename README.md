I have successfully implemented the core game logic and tested it using a simple test file.

You can run the test file yourself to verify the logic:

```bash
node src/test.js
```

The output should look like this:

```
Game setup complete!
Board tiles: 45
Cargo Deck size: 48
Function Deck size: 49
Players: 2
Current Player: Player 1
Player 1 position before move: { q: 0, r: 0 }
Player 1 position after move: { q: 1, r: 0 }
Player 1 cargo before draw: 0
Player 1 cargo after draw: 1
Player 1 function cards before draw: 0
Player 1 function cards after draw: 1
Current Player after next turn: Player 2
Player 2 function cards before play: 1
Player 2 cargo locked status: [ true ]
Player 2 function cards after play: 0
```
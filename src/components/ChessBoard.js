import React, { useState, useCallback, useEffect } from 'react';
import './ChessBoard.css';
import ChessPiece from './ChessPiece';

const ChessBoard = () => {
    const [board, setBoard] = useState(initializeBoard());
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [validMoves, setValidMoves] = useState([]);
    const [isComputerMode, setIsComputerMode] = useState(false);
    const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'check', 'checkmate', 'stalemate'

    function initializeBoard() {
        const initialBoard = Array(8).fill(null).map(() => Array(8).fill(null));
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        // Set up black pieces
        for (let i = 0; i < 8; i++) {
            initialBoard[0][i] = { piece: backRow[i], color: 'black' };
            initialBoard[1][i] = { piece: 'pawn', color: 'black' };
        }

        // Set up white pieces
        for (let i = 0; i < 8; i++) {
            initialBoard[6][i] = { piece: 'pawn', color: 'white' };
            initialBoard[7][i] = { piece: backRow[i], color: 'white' };
        }

        return initialBoard;
    }

    // Function to find the king's position for a given color
    const findKing = useCallback((board, color) => {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col]?.piece === 'king' && board[row][col]?.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }, []);

    const checkRookPath = useCallback((fromRow, fromCol, toRow, toCol) => {
        // Vertical movement
        if (fromCol === toCol) {
            const step = fromRow < toRow ? 1 : -1;
            for (let row = fromRow + step; row !== toRow; row += step) {
                if (board[row][fromCol] !== null) {
                    return false;
                }
            }
            return true;
        }

        // Horizontal movement with wrapping
        if (fromRow === toRow) {
            const directDist = Math.abs(toCol - fromCol);
            const wrappedDist = 8 - directDist;

            // Try direct path
            let isDirectPathClear = true;
            let currentCol = fromCol;
            const directStep = toCol > fromCol ? 1 : -1;

            for (let i = 0; i < directDist - 1; i++) {
                currentCol = (currentCol + directStep + 8) % 8;
                if (board[fromRow][currentCol] !== null) {
                    isDirectPathClear = false;
                    break;
                }
            }

            // Try wrapped path
            let isWrappedPathClear = true;
            currentCol = fromCol;
            const wrappedStep = toCol > fromCol ? -1 : 1;

            for (let i = 0; i < wrappedDist - 1; i++) {
                currentCol = (currentCol + wrappedStep + 8) % 8;
                if (board[fromRow][currentCol] !== null) {
                    isWrappedPathClear = false;
                    break;
                }
            }

            return isDirectPathClear || isWrappedPathClear;
        }

        return false;
    }, [board]);

    const checkDiagonalPath = useCallback((fromRow, fromCol, toRow, toCol, rowStep, colStep, isWrapped) => {
        let currentRow = fromRow;
        let currentCol = fromCol;
        const steps = Math.abs(toRow - fromRow);

        for (let i = 0; i < steps; i++) {
            currentRow += rowStep;
            currentCol = (currentCol + colStep + 8) % 8;

            if (i < steps - 1 && board[currentRow][currentCol] !== null) {
                return false;
            }
        }

        return currentRow === toRow && currentCol === toCol;
    }, [board]);

    // Function to check if a move is valid (without considering check)
    const isValidMoveBasic = useCallback((from, toRow, toCol, testBoard = null) => {
        const gameBoard = testBoard || board;
        const piece = gameBoard[from.row][from.col];
        if (!piece) return false;
        
        if (gameBoard[toRow][toCol] && gameBoard[toRow][toCol].color === piece.color) {
            return false;
        }
        
        const rowDiff = Math.abs(toRow - from.row);
        const directColDiff = Math.abs(toCol - from.col);
        const wrappedColDiff = 8 - directColDiff;
        const colDiff = Math.min(directColDiff, wrappedColDiff);
        
        switch (piece.piece) {
            case 'pawn': {
                const direction = piece.color === 'white' ? -1 : 1;
                const startRow = piece.color === 'white' ? 6 : 1;
                
                // Normal forward move (1 square)
                if (toCol === from.col && toRow === from.row + direction && !gameBoard[toRow][toCol]) {
                    return true;
                }
                
                // Initial two-square move
                if (from.row === startRow && toCol === from.col && 
                    toRow === from.row + (2 * direction) && 
                    !gameBoard[from.row + direction][from.col] && 
                    !gameBoard[toRow][toCol]) {
                    return true;
                }
                
                // Capture moves (including wrapping)
                if (toRow === from.row + direction && colDiff === 1 && gameBoard[toRow][toCol]) {
                    return true;
                }
                
                return false;
            }
            
            case 'rook': {
                if (rowDiff === 0 || directColDiff === 0) {
                    return checkRookPath(from.row, from.col, toRow, toCol);
                }
                return false;
            }
            
            case 'knight': {
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            }
            
            case 'bishop': {
                if (rowDiff === 0 || rowDiff > 7) return false;
                
                return (rowDiff === directColDiff || rowDiff === wrappedColDiff) && 
                       checkDiagonalPath(from.row, from.col, toRow, toCol,
                           toRow > from.row ? 1 : -1,
                           rowDiff === directColDiff ? 
                               (toCol > from.col ? 1 : -1) : 
                               (toCol > from.col ? -1 : 1),
                           rowDiff === wrappedColDiff);
            }
            
            case 'queen': {
                const isDiagonal = rowDiff === directColDiff || rowDiff === wrappedColDiff;
                const isStraight = rowDiff === 0 || directColDiff === 0;
                
                if (rowDiff > 7) return false;
                
                if (isStraight) {
                    return checkRookPath(from.row, from.col, toRow, toCol);
                }
                if (isDiagonal) {
                    return checkDiagonalPath(from.row, from.col, toRow, toCol,
                        toRow > from.row ? 1 : -1,
                        rowDiff === directColDiff ? 
                            (toCol > from.col ? 1 : -1) : 
                            (toCol > from.col ? -1 : 1),
                        rowDiff === wrappedColDiff);
                }
                return false;
            }
            
            case 'king': {
                return rowDiff <= 1 && colDiff <= 1;
            }
            
            default:
                return false;
        }
    }, [board, checkRookPath, checkDiagonalPath]);

    // Function to check if a square is under attack by the opponent
    const isSquareUnderAttack = useCallback((gameBoard, targetRow, targetCol, attackingColor) => {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === attackingColor) {
                    if (isValidMoveBasic({ row, col }, targetRow, targetCol, gameBoard)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, [isValidMoveBasic]);

    // Function to check if the current player is in check
    const isInCheck = useCallback((gameBoard, color) => {
        const king = findKing(gameBoard, color);
        if (!king) return false;
        
        const opponentColor = color === 'white' ? 'black' : 'white';
        return isSquareUnderAttack(gameBoard, king.row, king.col, opponentColor);
    }, [findKing, isSquareUnderAttack]);

    // Function to simulate a move and return the resulting board
    const simulateMove = useCallback((gameBoard, from, to) => {
        const newBoard = gameBoard.map(row => [...row]);
        newBoard[to.row][to.col] = newBoard[from.row][from.col];
        newBoard[from.row][from.col] = null;
        return newBoard;
    }, []);

    // Function to get all possible legal moves for a color
    const getAllLegalMoves = useCallback((gameBoard, color) => {
        const legalMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (isValidMoveBasic({ row, col }, toRow, toCol, gameBoard)) {
                                // Check if this move would leave the king in check
                                const testBoard = simulateMove(gameBoard, { row, col }, { row: toRow, col: toCol });
                                if (!isInCheck(testBoard, color)) {
                                    legalMoves.push({
                                        from: { row, col },
                                        to: { row: toRow, col: toCol },
                                        isCapture: gameBoard[toRow][toCol] !== null
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return legalMoves;
    }, [isValidMoveBasic, simulateMove, isInCheck]);

    // Function to check if the current player is in checkmate
    const isCheckmate = useCallback((gameBoard, color) => {
        if (!isInCheck(gameBoard, color)) return false;
        
        const legalMoves = getAllLegalMoves(gameBoard, color);
        return legalMoves.length === 0;
    }, [isInCheck, getAllLegalMoves]);

    // Function to check if the current player is in stalemate
    const isStalemate = useCallback((gameBoard, color) => {
        if (isInCheck(gameBoard, color)) return false;
        
        const legalMoves = getAllLegalMoves(gameBoard, color);
        return legalMoves.length === 0;
    }, [isInCheck, getAllLegalMoves]);

    // Updated isValidMove that considers check
    const isValidMove = useCallback((from, toRow, toCol) => {
        const piece = board[from.row][from.col];
        if (!piece || piece.color !== currentPlayer) return false;
        
        // First check if the basic move is valid
        if (!isValidMoveBasic(from, toRow, toCol)) return false;
        
        // Then check if this move would leave the king in check
        const testBoard = simulateMove(board, from, { row: toRow, col: toCol });
        return !isInCheck(testBoard, currentPlayer);
    }, [board, currentPlayer, isValidMoveBasic, simulateMove, isInCheck]);

    // Function to update game status
    const updateGameStatus = useCallback((gameBoard, color) => {
        if (isCheckmate(gameBoard, color)) {
            setGameStatus('checkmate');
        } else if (isStalemate(gameBoard, color)) {
            setGameStatus('stalemate');
        } else if (isInCheck(gameBoard, color)) {
            setGameStatus('check');
        } else {
            setGameStatus('playing');
        }
    }, [isCheckmate, isStalemate, isInCheck]);

    // Add function to calculate valid moves (updated to use legal moves)
    const calculateValidMoves = useCallback((row, col) => {
        const moves = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (isValidMove({ row, col }, i, j)) {
                    moves.push({
                        row: i,
                        col: j,
                        isCapture: board[i][j] !== null
                    });
                }
            }
        }
        return moves;
    }, [isValidMove, board]);

    // Add computer move logic (updated to use legal moves)
    const makeComputerMove = useCallback(() => {
        if (currentPlayer === 'black' && isComputerMode) {
            const allPossibleMoves = getAllLegalMoves(board, 'black');

            // Randomly select a move
            if (allPossibleMoves.length > 0) {
                const randomMove = allPossibleMoves[
                    Math.floor(Math.random() * allPossibleMoves.length)
                ];
                
                // Execute the move
                const newBoard = simulateMove(board, randomMove.from, randomMove.to);
                setBoard(newBoard);
                setCurrentPlayer('white');
                
                // Update game status for the next player
                updateGameStatus(newBoard, 'white');
            }
        }
    }, [board, currentPlayer, isComputerMode, getAllLegalMoves, simulateMove, updateGameStatus]);

    // Add effect for computer moves
    useEffect(() => {
        if (isComputerMode && currentPlayer === 'black') {
            const timer = setTimeout(makeComputerMove, 500);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, isComputerMode, makeComputerMove]);

    // Modify handleSquareClick to work with computer mode and update game status
    const handleSquareClick = useCallback((row, col) => {
        // Don't allow moves if game is over
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return;
        
        // Only allow white moves in computer mode
        if (isComputerMode && currentPlayer === 'black') return;

        if (selectedPiece) {
            if (isValidMove(selectedPiece, row, col)) {
                const newBoard = simulateMove(board, selectedPiece, { row, col });
                setBoard(newBoard);
                const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
                setCurrentPlayer(nextPlayer);
                
                // Update game status for the next player
                updateGameStatus(newBoard, nextPlayer);
            }
            setSelectedPiece(null);
            setValidMoves([]);
        } else if (board[row][col] && board[row][col].color === currentPlayer) {
            setSelectedPiece({ row, col });
            setValidMoves(calculateValidMoves(row, col));
        }
    }, [gameStatus, isComputerMode, currentPlayer, selectedPiece, isValidMove, simulateMove, board, updateGameStatus, calculateValidMoves]);

    // Function to get status message
    const getStatusMessage = () => {
        switch (gameStatus) {
            case 'check':
                return `${currentPlayer === 'white' ? 'White' : 'Black'} is in check!`;
            case 'checkmate':
                return `Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`;
            case 'stalemate':
                return 'Stalemate! The game is a draw.';
            default:
                return `Current player: ${currentPlayer}`;
        }
    };

    // Reset game function
    const resetGame = () => {
        setBoard(initializeBoard());
        setSelectedPiece(null);
        setCurrentPlayer('white');
        setValidMoves([]);
        setGameStatus('playing');
    };

    const isValidSquare = (row, col) => {
        return validMoves.some(move => move.row === row && move.col === col);
    };

    // Debug logging
    console.log('ChessBoard rendering, board:', board);

    return (
        <div className="chess-game">
            <div className="game-status">
                <h2>{getStatusMessage()}</h2>
                {(gameStatus === 'checkmate' || gameStatus === 'stalemate') && (
                    <button onClick={resetGame} className="reset-button">
                        New Game
                    </button>
                )}
            </div>
            
            <div className="game-controls">
                <label>
                    <input
                        type="checkbox"
                        checked={isComputerMode}
                        onChange={(e) => setIsComputerMode(e.target.checked)}
                        disabled={gameStatus === 'checkmate' || gameStatus === 'stalemate'}
                    />
                    Play against computer
                </label>
            </div>

            <div className="chess-board">
                {board.map((row, rowIndex) =>
                    row.map((square, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`chess-square ${
                                (rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'
                            } ${
                                selectedPiece &&
                                selectedPiece.row === rowIndex &&
                                selectedPiece.col === colIndex
                                    ? 'selected'
                                    : ''
                            } ${
                                isValidSquare(rowIndex, colIndex) ? 'valid-move' : ''
                            }`}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                        >
                            {square && (
                                <ChessPiece
                                    piece={square.piece}
                                    color={square.color}
                                />
                            )}
                            {isValidSquare(rowIndex, colIndex) && (
                                <div className="move-indicator" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChessBoard;
import React, { useState, useCallback, useEffect } from 'react';
import './ChessBoard.css';
import ChessPiece from './ChessPiece';

const ChessBoard = () => {
    const [board, setBoard] = useState(initializeBoard());
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [validMoves, setValidMoves] = useState([]);
    const [isComputerMode, setIsComputerMode] = useState(false);

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

const isValidMove = useCallback((from, toRow, toCol) => {
    const piece = board[from.row][from.col];
    if (!piece || piece.color !== currentPlayer) return false;
    
    if (board[toRow][toCol] && board[toRow][toCol].color === piece.color) {
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
            if (toCol === from.col && toRow === from.row + direction && !board[toRow][toCol]) {
                return true;
            }
            
            // Initial two-square move
            if (from.row === startRow && toCol === from.col && 
                toRow === from.row + (2 * direction) && 
                !board[from.row + direction][from.col] && 
                !board[toRow][toCol]) {
                return true;
            }
            
            // Capture moves (including wrapping)
            if (toRow === from.row + direction && colDiff === 1 && board[toRow][toCol]) {
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
}, [board, currentPlayer, checkRookPath, checkDiagonalPath]);




    // Add function to calculate valid moves
    const calculateValidMoves = (row, col) => {
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
    };

    // Add computer move logic
    const makeComputerMove = useCallback(() => {
        if (currentPlayer === 'black' && isComputerMode) {
            // Simple AI: Find all possible moves for black pieces
            let allPossibleMoves = [];
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col]?.color === 'black') {
                        const moves = calculateValidMoves(row, col);
                        moves.forEach(move => {
                            allPossibleMoves.push({
                                from: { row, col },
                                to: move
                            });
                        });
                    }
                }
            }

            // Randomly select a move
            if (allPossibleMoves.length > 0) {
                const randomMove = allPossibleMoves[
                    Math.floor(Math.random() * allPossibleMoves.length)
                ];
                
                // Execute the move
                const newBoard = board.map(row => [...row]);
                newBoard[randomMove.to.row][randomMove.to.col] = 
                    newBoard[randomMove.from.row][randomMove.from.col];
                newBoard[randomMove.from.row][randomMove.from.col] = null;
                setBoard(newBoard);
                setCurrentPlayer('white');
            }
        }
    }, [board, currentPlayer, isComputerMode, calculateValidMoves]);

    // Add effect for computer moves
    useEffect(() => {
        if (isComputerMode && currentPlayer === 'black') {
            const timer = setTimeout(makeComputerMove, 500); // 500ms delay for natural feel
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, isComputerMode, makeComputerMove]);

    // Modify handleSquareClick to work with computer mode
    const handleSquareClick = (row, col) => {
        // Only allow white moves in computer mode
        if (isComputerMode && currentPlayer === 'black') return;

        if (selectedPiece) {
            if (isValidMove(selectedPiece, row, col)) {
                const newBoard = board.map(row => [...row]);
                newBoard[row][col] = newBoard[selectedPiece.row][selectedPiece.col];
                newBoard[selectedPiece.row][selectedPiece.col] = null;
                setBoard(newBoard);
                setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
            }
            setSelectedPiece(null);
            setValidMoves([]);
        } else if (board[row][col] && board[row][col].color === currentPlayer) {
            setSelectedPiece({ row, col });
            setValidMoves(calculateValidMoves(row, col));
        }
    };

    const handleRotationChange = (e) => {
        const newRotation = Number(e.target.value);
    };

    // Add mode switch handler
    const toggleGameMode = () => {
        setIsComputerMode(!isComputerMode);
        // Reset the game when switching modes
        setBoard(initializeBoard());
        setSelectedPiece(null);
        setValidMoves([]);
        setCurrentPlayer('white');
    };

    // Update square rendering in the return statement
    return (
        <div className="chess-game">
            <div className="game-controls">
                <button 
                    className="mode-switch"
                    onClick={toggleGameMode}
                >
                    {isComputerMode ? 'Switch to Two Players' : 'Switch to Computer Mode'}
                </button>
                <div className="status">
                    Current Player: {currentPlayer}
                    {isComputerMode && <span> ({currentPlayer === 'white' ? 'Your turn' : 'Computer thinking...'})</span>}
                </div>
            </div>
            <div className="chess-board">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="board-row">
                        {row.map((square, colIndex) => {
                            const isValidMove = validMoves.find(
                                move => move.row === rowIndex && move.col === colIndex
                            );
                            const classes = [
                                'square',
                                (rowIndex + colIndex) % 2 === 0 ? 'white' : 'black',
                                selectedPiece && selectedPiece.row === rowIndex &&
                                    selectedPiece.col === colIndex ? 'selected' : '',
                                isValidMove ? (isValidMove.isCapture ? 'valid-capture' : 'valid-move') : ''
                            ].filter(Boolean).join(' ');

                            return (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={classes}
                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                >
                                    {square && <ChessPiece piece={square.piece} color={square.color} />}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {/* <div className="rotation-controls">
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={rotation}
                    onChange={handleRotationChange}
                />
                <span className="rotation-value">{rotation}°</span>
            </div> */}
        </div>
    );
};

export default ChessBoard;
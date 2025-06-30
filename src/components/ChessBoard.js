import React, { useState, useCallback } from 'react';
import './ChessBoard.css';
import ChessPiece from './ChessPiece';

const ChessBoard = () => {
    const [board, setBoard] = useState(initializeBoard());
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [rotation, setRotation] = useState(90);
    const [validMoves, setValidMoves] = useState([]);

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
        // For vertical movement
        if (fromCol === toCol) {
            const step = fromRow < toRow ? 1 : -1;
            for (let row = fromRow + step; row !== toRow; row += step) {
                if (board[row][fromCol] !== null) {
                    return false;
                }
            }
            return true;
        }
        
        // For horizontal movement with wrapping
        if (fromRow === toRow) {
            const directDist = Math.abs(toCol - fromCol);
            const wrappedDist = 8 - directDist;
            
            // Check both potential paths (direct and wrapped)
            // Direct path
            let directBlocked = false;
            const directStep = toCol > fromCol ? 1 : -1;
            let col = fromCol;
            for (let i = 0; i < directDist; i++) {
                col = (col + directStep + 8) % 8;
                if (col !== toCol && board[fromRow][col] !== null) {
                    directBlocked = true;
                    break;
                }
            }
        
            // Wrapped path
            let wrappedBlocked = false;
            const wrappedStep = toCol > fromCol ? -1 : 1;
            col = fromCol;
            for (let i = 0; i < wrappedDist; i++) {
                col = (col + wrappedStep + 8) % 8;
                if (col !== toCol && board[fromRow][col] !== null) {
                    wrappedBlocked = true;
                    break;
                }
            }
        
            // If both paths are blocked, the move is invalid
            if (directBlocked && wrappedBlocked) {
                return false;
            }
        
            // Choose the unblocked path if one exists
            return !directBlocked || !wrappedBlocked;
        }
        
        return false;
    }, [board]);

    const checkBishopPath = useCallback((fromRow, fromCol, toRow, toCol) => {
        const rowStep = toRow > fromRow ? 1 : -1;
        const directDist = Math.abs(toCol - fromCol);
        const wrappedDist = 8 - directDist;
        const useWrapping = wrappedDist < directDist;
        
        let colStep;
        if (useWrapping) {
            colStep = toCol > fromCol ? -1 : 1;
        } else {
            colStep = toCol > fromCol ? 1 : -1;
        }
        
        let currentRow = fromRow + rowStep;
        let currentCol = (fromCol + colStep + 8) % 8;
        
        while (currentRow !== toRow) {
            if (board[currentRow][currentCol] !== null) {
                return false;
            }
            currentRow += rowStep;
            currentCol = (currentCol + colStep + 8) % 8;
        }
        
        return true;
    }, [board]);

    const isValidMove = useCallback((from, toRow, toCol) => {
        const piece = board[from.row][from.col];
        if (!piece || piece.color !== currentPlayer) return false;
        
        // Don't allow capturing own pieces
        if (board[toRow][toCol] && board[toRow][toCol].color === piece.color) {
            return false;
        }
        
        const rowDiff = Math.abs(toRow - from.row);
        const colDiff = Math.abs(toCol - from.col);
        const wrappedColDiff = Math.min(colDiff, 8 - colDiff);
        
        switch (piece.piece) {
            case 'rook': {
                if (rowDiff === 0 || colDiff === 0) {
                    return checkRookPath(from.row, from.col, toRow, toCol);
                }
                return false;
            }
            case 'king': {
                return rowDiff <= 1 && wrappedColDiff <= 1;
            }
            case 'queen': {
                if (rowDiff === 0 || colDiff === 0) {
                    return checkRookPath(from.row, from.col, toRow, toCol);
                } else if (rowDiff === wrappedColDiff) {
                    return checkBishopPath(from.row, from.col, toRow, toCol);
                }
                return false;
            }
            case 'bishop': {
                if (rowDiff === wrappedColDiff) {
                    return checkBishopPath(from.row, from.col, toRow, toCol);
                }
                return false;
            }
            case 'knight': {
                return (rowDiff === 2 && wrappedColDiff === 1) || 
                       (rowDiff === 1 && wrappedColDiff === 2);
            }
            case 'pawn': {
                const direction = piece.color === 'white' ? -1 : 1;
                const startRow = piece.color === 'white' ? 6 : 1;
                
                if (colDiff === 0) {
                    if (toRow === from.row + direction && !board[toRow][toCol]) {
                        return true;
                    }
                    if (from.row === startRow && 
                        toRow === from.row + 2 * direction && 
                        !board[from.row + direction][toCol] && 
                        !board[toRow][toCol]) {
                        return true;
                    }
                }
                
                if (wrappedColDiff === 1 && toRow === from.row + direction && 
                    board[toRow][toCol] && 
                    board[toRow][toCol].color !== piece.color) {
                    return true;
                }
                return false;
            }
            default:
                return false;
        }
    }, [board, currentPlayer, checkRookPath, checkBishopPath]);

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

    // Update handleSquareClick
    const handleSquareClick = (row, col) => {
        if (selectedPiece) {
            if (isValidMove(selectedPiece, row, col)) {
                const newBoard = board.map(row => [...row]);
                newBoard[row][col] = newBoard[selectedPiece.row][selectedPiece.col];
                newBoard[selectedPiece.row][selectedPiece.col] = null;
                setBoard(newBoard);
                setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
            }
            setSelectedPiece(null);
            setValidMoves([]); // Clear valid moves
        } else if (board[row][col] && board[row][col].color === currentPlayer) {
            setSelectedPiece({ row, col });
            setValidMoves(calculateValidMoves(row, col)); // Calculate valid moves
        }
    };

    const handleRotationChange = (e) => {
        const newRotation = Number(e.target.value);
        setRotation(newRotation);
    };

    // Update square rendering in the return statement
    return (
        <div className="chess-game">
            <div className="status">Current Player: {currentPlayer}</div>
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
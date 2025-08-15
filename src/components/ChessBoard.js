
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
    const [promotionState, setPromotionState] = useState(null); // { row, col, color } when promotion is needed
    const [castlingRights, setCastlingRights] = useState({
        white: { kingside: true, queenside: true, kingMoved: false },
        black: { kingside: true, queenside: true, kingMoved: false }
    });
    const [moveHistory, setMoveHistory] = useState([]); // Track moves for castling rights
    const [enPassantTarget, setEnPassantTarget] = useState(null); // Track en passant target square

    // Timer states
    const [timeControl, setTimeControl] = useState({ minutes: 10, increment: 0 }); // Default 10 minutes
    const [timeLeft, setTimeLeft] = useState({
        white: 10 * 60 * 1000, // 10 minutes in milliseconds
        black: 10 * 60 * 1000
    });
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    // Timer effect
    useEffect(() => {
        let intervalId;

        if (isTimerActive && (gameStatus === 'playing' || gameStatus === 'check') && gameStarted) {
            intervalId = setInterval(() => {
                setTimeLeft(prev => {
                    const newTime = { ...prev };
                    newTime[currentPlayer] = Math.max(0, newTime[currentPlayer] - 1000);

                    // Check for time out
                    if (newTime[currentPlayer] === 0) {
                        setGameStatus('timeout');
                        setIsTimerActive(false);
                    }

                    return newTime;
                });
            }, 1000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isTimerActive, currentPlayer, gameStatus, gameStarted]);

    // Format time for display
    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Start the game and timer
    const startGame = () => {
        setGameStarted(true);
        setIsTimerActive(true);
        setGameStatus('playing');
    };

    // Pause/Resume timer
    const toggleTimer = () => {
        if (gameStarted) {
            setIsTimerActive(prev => !prev);
        }
    };

    // Reset timer
    const resetTimer = () => {
        setTimeLeft({
            white: timeControl.minutes * 60 * 1000,
            black: timeControl.minutes * 60 * 1000
        });
        setIsTimerActive(false);
        setGameStarted(false);
        setGameStatus('playing');
    };

    // Update time control settings
    const updateTimeControl = (minutes, increment = 0) => {
        setTimeControl({ minutes, increment });
        setTimeLeft({
            white: minutes * 60 * 1000,
            black: minutes * 60 * 1000
        });
    };

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

    // Function to check if a pawn move results in promotion
    const isPawnPromotion = (piece, fromRow, toRow) => {
        if (piece.piece !== 'pawn') return false;
        if (piece.color === 'white' && toRow === 0) return true;
        if (piece.color === 'black' && toRow === 7) return true;
        return false;
    };

    // Function to handle pawn promotion
    const handlePawnPromotion = (row, col, promotionPiece) => {
        const newBoard = board.map(row => [...row]);
        newBoard[row][col] = { piece: promotionPiece, color: promotionState.color };
        setBoard(newBoard);
        setPromotionState(null);

        // Switch to next player and update game status
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        setCurrentPlayer(nextPlayer);

        // Add increment time if applicable
        if (timeControl.increment > 0) {
            setTimeLeft(prev => ({
                ...prev,
                [currentPlayer]: prev[currentPlayer] + (timeControl.increment * 1000)
            }));
        }

        updateGameStatus(newBoard, nextPlayer);
    };

    // Computer pawn promotion (always promote to queen for simplicity)
    const handleComputerPromotion = (newBoard, row, col, color) => {
        newBoard[row][col] = { piece: 'queen', color };
        return newBoard;
    };

    // Check if en passant is possible
    const canEnPassant = (from, toRow, toCol) => {
        const piece = board[from.row][from.col];
        if (!piece || piece.piece !== 'pawn') return false;

        // Must have an en passant target
        if (!enPassantTarget) return false;

        // Must be moving to the en passant target square
        if (toRow !== enPassantTarget.row || toCol !== enPassantTarget.col) return false;

        const direction = piece.color === 'white' ? -1 : 1;
        const captureRow = piece.color === 'white' ? 3 : 4; // Row where the capturing pawn must be
        const targetRow = captureRow + direction; // Row where the target square must be

        // Check if we're on the correct rank and moving to the correct target
        return from.row === captureRow && toRow === targetRow;
    };

    // Helper functions without useCallback to avoid circular dependencies
    const findKing = (gameBoard, color) => {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (gameBoard[row][col]?.piece === 'king' && gameBoard[row][col]?.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    };

    const checkRookPath = (gameBoard, fromRow, fromCol, toRow, toCol) => {
        // Vertical movement
        if (fromCol === toCol) {
            const step = fromRow < toRow ? 1 : -1;
            for (let row = fromRow + step; row !== toRow; row += step) {
                if (gameBoard[row][fromCol] !== null) {
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
                if (gameBoard[fromRow][currentCol] !== null) {
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
                if (gameBoard[fromRow][currentCol] !== null) {
                    isWrappedPathClear = false;
                    break;
                }
            }

            return isDirectPathClear || isWrappedPathClear;
        }

        return false;
    };

    const checkDiagonalPath = (gameBoard, fromRow, fromCol, toRow, toCol, rowStep, colStep) => {
        let currentRow = fromRow;
        let currentCol = fromCol;
        const steps = Math.abs(toRow - fromRow);

        for (let i = 0; i < steps; i++) {
            currentRow += rowStep;
            currentCol = (currentCol + colStep + 8) % 8;

            if (i < steps - 1 && gameBoard[currentRow][currentCol] !== null) {
                return false;
            }
        }

        return currentRow === toRow && currentCol === toCol;
    };

    // Function to check if a move is valid (basic version without castling or en passant)
    const isValidMoveBasic = (from, toRow, toCol, gameBoard, currentEnPassantTarget = null) => {
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

                // Regular capture moves (including wrapping)
                if (toRow === from.row + direction && colDiff === 1 && gameBoard[toRow][toCol]) {
                    return true;
                }

                // En passant capture
                if (currentEnPassantTarget &&
                    toRow === currentEnPassantTarget.row &&
                    toCol === currentEnPassantTarget.col &&
                    toRow === from.row + direction &&
                    colDiff === 1) {
                    return true;
                }

                return false;
            }

            case 'rook': {
                if (rowDiff === 0 || directColDiff === 0) {
                    return checkRookPath(gameBoard, from.row, from.col, toRow, toCol);
                }
                return false;
            }

            case 'knight': {
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            }

            case 'bishop': {
                if (rowDiff === 0 || rowDiff > 7) return false;

                return (rowDiff === directColDiff || rowDiff === wrappedColDiff) &&
                    (checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, 1)
                        ||
                        checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, -1)
                    );
            }

            case 'queen': {
                const isDiagonal = rowDiff === directColDiff || rowDiff === wrappedColDiff;
                const isStraight = rowDiff === 0 || directColDiff === 0;

                if (rowDiff > 7) return false;

                if (isStraight) {
                    return checkRookPath(gameBoard, from.row, from.col, toRow, toCol);
                }
                if (isDiagonal) {
                    return (checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, 1)
                        ||
                        checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, -1)
                    );
                }
                return false;
            }

            case 'king': {
                // Only regular king moves (no castling in basic validation)
                return rowDiff <= 1 && colDiff <= 1;
            }

            default:
                return false;
        }
    };

    // Function to check if a square is under attack by the opponent
    const isSquareUnderAttack = (gameBoard, targetRow, targetCol, attackingColor, currentEnPassantTarget = null) => {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === attackingColor) {
                    if (isValidMoveBasic({ row, col }, targetRow, targetCol, gameBoard, currentEnPassantTarget)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Function to check if the current player is in check
    const isInCheck = (gameBoard, color) => {
        const king = findKing(gameBoard, color);
        if (!king) return false;

        const opponentColor = color === 'white' ? 'black' : 'white';
        return isSquareUnderAttack(gameBoard, king.row, king.col, opponentColor);
    };

    // Function to check if castling is possible
    const canCastle = (color, side, gameBoard, currentCastlingRights) => {
        const row = color === 'white' ? 7 : 0;
        const rights = currentCastlingRights[color];

        // Check if castling rights are still available
        if (rights.kingMoved || (side === 'kingside' && !rights.kingside) || (side === 'queenside' && !rights.queenside)) {
            return false;
        }

        // Check if king is in check
        if (isInCheck(gameBoard, color)) {
            return false;
        }

        // Define positions for castling
        const kingCol = 4;
        const rookCol = side === 'kingside' ? 7 : 0;

        // Check if king and rook are in their starting positions
        const king = gameBoard[row][kingCol];
        const rook = gameBoard[row][rookCol];

        if (!king || king.piece !== 'king' || king.color !== color) return false;
        if (!rook || rook.piece !== 'rook' || rook.color !== color) return false;

        // Check if path is clear between king and rook
        const startCol = Math.min(kingCol, rookCol);
        const endCol = Math.max(kingCol, rookCol);

        for (let col = startCol + 1; col < endCol; col++) {
            if (gameBoard[row][col] !== null) return false;
        }

        // Check if king doesn't pass through or end up in check
        const opponentColor = color === 'white' ? 'black' : 'white';
        const colsToCheck = side === 'kingside' ? [kingCol, kingCol + 1, kingCol + 2] : [kingCol, kingCol - 1, kingCol - 2];

        for (const col of colsToCheck) {
            if (isSquareUnderAttack(gameBoard, row, col, opponentColor)) {
                return false;
            }
        }

        return true;
    };

    // Function to execute castling move
    const executeCastle = (gameBoard, color, side) => {
        const newBoard = gameBoard.map(row => [...row]);
        const row = color === 'white' ? 7 : 0;

        const kingCol = 4;
        const rookCol = side === 'kingside' ? 7 : 0;
        const kingDestCol = side === 'kingside' ? 6 : 2;
        const rookDestCol = side === 'kingside' ? 5 : 3;

        // Move king
        newBoard[row][kingDestCol] = newBoard[row][kingCol];
        newBoard[row][kingCol] = null;

        // Move rook
        newBoard[row][rookDestCol] = newBoard[row][rookCol];
        newBoard[row][rookCol] = null;

        return newBoard;
    };

    // Function to execute en passant move
    const executeEnPassant = (gameBoard, from, to) => {
        const newBoard = gameBoard.map(row => [...row]);
        const piece = gameBoard[from.row][from.col];

        // Move the pawn to the target square
        newBoard[to.row][to.col] = piece;
        newBoard[from.row][from.col] = null;

        // Remove the captured pawn (it's on the same row as the moving pawn)
        newBoard[from.row][to.col] = null;

        return newBoard;
    };

    // Extended move validation that includes castling and en passant
    const isValidMoveExtended = (from, toRow, toCol, gameBoard, currentCastlingRights, currentEnPassantTarget = null) => {
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

                // Regular capture moves (including wrapping)
                if (toRow === from.row + direction && colDiff === 1 && gameBoard[toRow][toCol]) {
                    return true;
                }

                // En passant capture
                if (currentEnPassantTarget &&
                    toRow === currentEnPassantTarget.row &&
                    toCol === currentEnPassantTarget.col &&
                    toRow === from.row + direction &&
                    colDiff === 1) {
                    return true;
                }

                return false;
            }

            case 'rook': {
                if (rowDiff === 0 || directColDiff === 0) {
                    return checkRookPath(gameBoard, from.row, from.col, toRow, toCol);
                }
                return false;
            }

            case 'knight': {
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            }

            case 'bishop': {
                if (rowDiff === 0 || rowDiff > 7) return false;

                return (rowDiff === directColDiff || rowDiff === wrappedColDiff) &&
                    (checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, 1)
                        ||
                        checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, -1)
                    );
            }

            case 'queen': {
                const isDiagonal = rowDiff === directColDiff || rowDiff === wrappedColDiff;
                const isStraight = rowDiff === 0 || directColDiff === 0;

                if (rowDiff > 7) return false;

                if (isStraight) {
                    return checkRookPath(gameBoard, from.row, from.col, toRow, toCol);
                }
                if (isDiagonal) {
                    return (checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, 1)
                        ||
                        checkDiagonalPath(gameBoard, from.row, from.col, toRow, toCol,
                            toRow > from.row ? 1 : -1, -1)
                    );
                }
                return false;
            }

            case 'king': {
                // Regular king move (one square)
                if (rowDiff <= 1 && colDiff <= 1) {
                    return true;
                }

                // Castling move (two squares horizontally)
                if (rowDiff === 0 && directColDiff === 2) {
                    const side = toCol > from.col ? 'kingside' : 'queenside';
                    return canCastle(piece.color, side, gameBoard, currentCastlingRights);
                }

                return false;
            }

            default:
                return false;
        }
    };

    // Function to simulate a move and return the resulting board
    const simulateMove = (gameBoard, from, to, isCastling = false, castlingSide = null, isEnPassant = false) => {
        if (isCastling && castlingSide) {
            const piece = gameBoard[from.row][from.col];
            return executeCastle(gameBoard, piece.color, castlingSide);
        } else if (isEnPassant) {
            return executeEnPassant(gameBoard, from, to);
        } else {
            const newBoard = gameBoard.map(row => [...row]);
            newBoard[to.row][to.col] = newBoard[from.row][from.col];
            newBoard[from.row][from.col] = null;
            return newBoard;
        }
    };

    // Function to get all possible legal moves for a color
    const getAllLegalMoves = (gameBoard, color, currentCastlingRights, currentEnPassantTarget = null) => {
        const legalMoves = [];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (isValidMoveExtended({ row, col }, toRow, toCol, gameBoard, currentCastlingRights, currentEnPassantTarget)) {
                                // Check if this is a castling move
                                const isCastling = piece.piece === 'king' && Math.abs(toCol - col) === 2;
                                const castlingSide = isCastling ? (toCol > col ? 'kingside' : 'queenside') : null;

                                // Check if this is an en passant move
                                const isEnPassant = piece.piece === 'pawn' &&
                                    currentEnPassantTarget &&
                                    toRow === currentEnPassantTarget.row &&
                                    toCol === currentEnPassantTarget.col;

                                // Check if this move would leave the king in check
                                const testBoard = simulateMove(gameBoard, { row, col }, { row: toRow, col: toCol }, isCastling, castlingSide, isEnPassant);
                                if (!isInCheck(testBoard, color)) {
                                    legalMoves.push({
                                        from: { row, col },
                                        to: { row: toRow, col: toCol },
                                        isCapture: gameBoard[toRow][toCol] !== null || isEnPassant,
                                        isCastling,
                                        castlingSide,
                                        isEnPassant
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        return legalMoves;
    };

    // Function to update castling rights after a move
    const updateCastlingRights = useCallback((from, to, piece) => {
        setCastlingRights(prev => {
            const newRights = { ...prev };
            const color = piece.color;

            // If king moves, lose all castling rights for that color
            if (piece.piece === 'king') {
                newRights[color] = {
                    kingside: false,
                    queenside: false,
                    kingMoved: true
                };
            }

            // If rook moves from starting position, lose castling rights for that side
            if (piece.piece === 'rook') {
                const startRow = color === 'white' ? 7 : 0;
                if (from.row === startRow) {
                    if (from.col === 0) { // Queenside rook
                        newRights[color].queenside = false;
                    } else if (from.col === 7) { // Kingside rook
                        newRights[color].kingside = false;
                    }
                }
            }

            // If a rook is captured, remove castling rights for that side
            const capturedPiece = board[to.row][to.col];
            if (capturedPiece && capturedPiece.piece === 'rook') {
                const capturedColor = capturedPiece.color;
                const startRow = capturedColor === 'white' ? 7 : 0;
                if (to.row === startRow) {
                    if (to.col === 0) { // Queenside rook captured
                        newRights[capturedColor].queenside = false;
                    } else if (to.col === 7) { // Kingside rook captured
                        newRights[capturedColor].kingside = false;
                    }
                }
            }

            return newRights;
        });
    }, [board]);

    // Updated isValidMove that considers check, castling, and en passant
    const isValidMove = useCallback((from, toRow, toCol) => {
        const piece = board[from.row][from.col];
        if (!piece || piece.color !== currentPlayer) return false;

        // First check if the basic move is valid according to piece movement rules
        if (!isValidMoveExtended(from, toRow, toCol, board, castlingRights, enPassantTarget)) return false;

        // Check if this is a castling move
        const isCastling = piece.piece === 'king' && Math.abs(toCol - from.col) === 2;
        const castlingSide = isCastling ? (toCol > from.col ? 'kingside' : 'queenside') : null;

        // Check if this is an en passant move
        const isEnPassant = piece.piece === 'pawn' &&
            enPassantTarget &&
            toRow === enPassantTarget.row &&
            toCol === enPassantTarget.col;

        // Simulate the move to check if it leaves the king in check
        const testBoard = simulateMove(board, from, { row: toRow, col: toCol }, isCastling, castlingSide, isEnPassant);

        // The move is valid if it doesn't leave our king in check
        return !isInCheck(testBoard, currentPlayer);
    }, [board, currentPlayer, castlingRights, enPassantTarget]);

    // Computer move logic (simplified)
    const makeComputerMove = useCallback(() => {
        if (currentPlayer === 'black' && isComputerMode && (gameStatus === 'playing' || gameStatus === 'check')) {
            const legalMoves = getAllLegalMoves(board, 'black', castlingRights, enPassantTarget);

            if (legalMoves.length === 0) {
                // No legal moves available
                const inCheck = isInCheck(board, 'black');
                setGameStatus(inCheck ? 'checkmate' : 'stalemate');
                setIsTimerActive(false);
                return;
            }

            // Simple random move selection (can be improved with better AI)
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];

            setTimeout(() => {
                makeMove(randomMove.from, randomMove.to);
            }, 1000);
        }
    }, [currentPlayer, isComputerMode, gameStatus, board, castlingRights, enPassantTarget]);

    // Updated makeMove function to include timer logic and en passant
    const makeMove = useCallback((from, to) => {
        if (!isValidMove(from, to.row, to.col)) return false;

        const piece = board[from.row][from.col];
        if (!piece || piece.color !== currentPlayer) return false;

        // Check if this is a castling move
        const isCastling = piece.piece === 'king' && Math.abs(to.col - from.col) === 2;
        const castlingSide = isCastling ? (to.col > from.col ? 'kingside' : 'queenside') : null;

        // Check if this is an en passant move
        const isEnPassant = piece.piece === 'pawn' &&
            enPassantTarget &&
            to.row === enPassantTarget.row &&
            to.col === enPassantTarget.col;

        let newBoard;
        if (isCastling && castlingSide) {
            newBoard = executeCastle(board, piece.color, castlingSide);
        } else if (isEnPassant) {
            newBoard = executeEnPassant(board, from, to);
        } else {
            newBoard = board.map(row => [...row]);
            newBoard[to.row][to.col] = newBoard[from.row][from.col];
            newBoard[from.row][from.col] = null;
        }

        // Handle pawn promotion
        if (isPawnPromotion(piece, from.row, to.row)) {
            if (currentPlayer === 'white') {
                setPromotionState({ row: to.row, col: to.col, color: piece.color });
            } else {
                // Computer auto-promotes to queen
                newBoard = handleComputerPromotion(newBoard, to.row, to.col, piece.color);
            }
        }

        // Update en passant target
        if (piece.piece === 'pawn' && Math.abs(to.row - from.row) === 2) {
            // Pawn moved two squares, set en passant target
            const targetRow = (from.row + to.row) / 2;
            setEnPassantTarget({ row: targetRow, col: from.col });
        } else {
            // Clear en passant target
            setEnPassantTarget(null);
        }

        // Update castling rights
        updateCastlingRights(from, to, piece);

        // Add move to history
        setMoveHistory(prev => [...prev, { from, to, piece, timestamp: Date.now(), isEnPassant }]);

        setBoard(newBoard);
        setSelectedPiece(null);
        setValidMoves([]);

        // Switch players and add increment time
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        if (!promotionState) {
            setCurrentPlayer(nextPlayer);

            // Add increment time if applicable
            if (timeControl.increment > 0 && gameStarted) {
                setTimeLeft(prev => ({
                    ...prev,
                    [currentPlayer]: prev[currentPlayer] + (timeControl.increment * 1000)
                }));
            }
        }

        // Update game status
        if (!promotionState) {
            updateGameStatus(newBoard, nextPlayer);
        }

        return true;
    }, [board, currentPlayer, isValidMove, updateCastlingRights, promotionState, timeControl.increment, gameStarted, enPassantTarget]);

    // Update game status (check, checkmate, stalemate)
    const updateGameStatus = useCallback((gameBoard, player) => {
        const legalMoves = getAllLegalMoves(gameBoard, player, castlingRights, enPassantTarget);
        const inCheck = isInCheck(gameBoard, player);

        if (legalMoves.length === 0) {
            if (inCheck) {
                setGameStatus('checkmate');
                setIsTimerActive(false);
            } else {
                setGameStatus('stalemate');
                setIsTimerActive(false);
            }
        } else if (inCheck) {
            setGameStatus('check');
        } else {
            setGameStatus('playing');
        }
    }, [castlingRights, enPassantTarget]);

    // Get valid moves for a piece
    const getValidMovesForPiece = useCallback((row, col) => {
        const moves = [];
        const piece = board[row][col];

        if (!piece || piece.color !== currentPlayer) {
            return moves;
        }

        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (isValidMove({ row, col }, toRow, toCol)) {
                    moves.push({ row: toRow, col: toCol });
                }
            }
        }

        return moves;
    }, [board, currentPlayer, isValidMove]);

    // Handle square click
    const handleSquareClick = useCallback((row, col) => {
        if ((gameStatus !== 'playing' && gameStatus !== 'check') || (isComputerMode && currentPlayer === 'black')) return;

        // If no piece is selected
        if (!selectedPiece) {
            const piece = board[row][col];
            if (piece && piece.color === currentPlayer) {
                setSelectedPiece({ row, col });
                setValidMoves(getValidMovesForPiece(row, col));
            }
            return;
        }

        // If clicking on the same piece, deselect it
        if (selectedPiece.row === row && selectedPiece.col === col) {
            setSelectedPiece(null);
            setValidMoves([]);
            return;
        }

        // If clicking on another piece of the same color, select it
        const clickedPiece = board[row][col];
        if (clickedPiece && clickedPiece.color === currentPlayer) {
            setSelectedPiece({ row, col });
            setValidMoves(getValidMovesForPiece(row, col));
            return;
        }

        // Try to make a move
        if (makeMove(selectedPiece, { row, col })) {
            // Move successful
            if (!gameStarted) {
                startGame();
            }
        } else {
            // Invalid move, keep selection
            console.log('Invalid move');
        }
    }, [board, selectedPiece, currentPlayer, gameStatus, isComputerMode, getValidMovesForPiece, makeMove, gameStarted]);

    // Effect for computer moves
    useEffect(() => {
        makeComputerMove();
    }, [makeComputerMove]);

    // New game function
    const startNewGame = () => {
        setBoard(initializeBoard());
        setSelectedPiece(null);
        setCurrentPlayer('white');
        setValidMoves([]);
        setGameStatus('playing');
        setPromotionState(null);
        setCastlingRights({
            white: { kingside: true, queenside: true, kingMoved: false },
            black: { kingside: true, queenside: true, kingMoved: false }
        });
        setMoveHistory([]);
        setEnPassantTarget(null);
        resetTimer();
    };

    return (
        <div className="chess-container">
            <div className="chess-timer-container">
                {/* Timer Controls */}
                <div className="timer-controls">
                    <div className="time-control-buttons">
                        <button onClick={() => updateTimeControl(1)} className={timeControl.minutes === 1 ? 'active' : ''}>
                            1 min
                        </button>
                        <button onClick={() => updateTimeControl(3)} className={timeControl.minutes === 3 ? 'active' : ''}>
                            3 min
                        </button>
                        <button onClick={() => updateTimeControl(5)} className={timeControl.minutes === 5 ? 'active' : ''}>
                            5 min
                        </button>
                        <button onClick={() => updateTimeControl(10)} className={timeControl.minutes === 10 ? 'active' : ''}>
                            10 min
                        </button>
                        <button onClick={() => updateTimeControl(15)} className={timeControl.minutes === 15 ? 'active' : ''}>
                            15 min
                        </button>
                    </div>
                    <div className="timer-action-buttons">
                        <button onClick={startGame} disabled={gameStarted && isTimerActive}>
                            Start
                        </button>
                        <button onClick={toggleTimer} disabled={!gameStarted}>
                            {isTimerActive ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={resetTimer}>
                            Reset
                        </button>
                    </div>
                </div>

                {/* Timers */}
                <div className="chess-timers">
                    <div className={`timer ${currentPlayer === 'black' && isTimerActive ? 'active' : ''} ${timeLeft.black <= 30000 ? 'low-time' : ''}`}>
                        <div className="timer-label">Black</div>
                        <div className="timer-time">{formatTime(timeLeft.black)}</div>
                    </div>
                    <div className={`timer ${currentPlayer === 'white' && isTimerActive ? 'active' : ''} ${timeLeft.white <= 30000 ? 'low-time' : ''}`}>
                        <div className="timer-label">White</div>
                        <div className="timer-time">{formatTime(timeLeft.white)}</div>
                    </div>
                </div>
            </div>

            <div className="chess-game">
                {/* Game status */}
                <div className="game-status">
                    <div className="status-info">
                        {gameStatus === 'checkmate' && (
                            <span className="status checkmate">
                                Checkmate! {currentPlayer === 'white' ? 'Black' : 'White'} wins!
                            </span>
                        )}
                        {gameStatus === 'stalemate' && (
                            <span className="status stalemate">Stalemate! It's a draw.</span>
                        )}
                        {gameStatus === 'check' && (
                            <span className="status check">Check!</span>
                        )}
                        {gameStatus === 'timeout' && (
                            <span className="status timeout">
                                Time out! {currentPlayer === 'white' ? 'Black' : 'White'} wins!
                            </span>
                        )}
                        {gameStatus === 'playing' && !gameStarted && (
                            <span className="status waiting">Click Start or make a move to begin</span>
                        )}
                        {gameStatus === 'playing' && gameStarted && (
                            <span className="status playing">
                                {currentPlayer === 'white' ? 'White' : 'Black'} to move
                            </span>
                        )}
                    </div>

                    <div className="game-controls">
                        <button onClick={() => setIsComputerMode(!isComputerMode)}>
                            {isComputerMode ? 'vs Computer' : 'vs Human'}
                        </button>
                        <button onClick={startNewGame}>New Game</button>
                    </div>
                </div>

                {/* Chess board */}
                <div className="chess-board">
                    {board.map((row, rowIndex) =>
                        row.map((square, colIndex) => {
                            const isSelected = selectedPiece && selectedPiece.row === rowIndex && selectedPiece.col === colIndex;
                            const isValidMove = validMoves.some(move => move.row === rowIndex && move.col === colIndex);
                            const isLight = (rowIndex + colIndex) % 2 === 0;

                            return (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''}`}
                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                >
                                    {square && (
                                        <ChessPiece
                                            piece={square.piece}
                                            color={square.color}
                                        />
                                    )}
                                    {isValidMove && <div className="move-indicator" />}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pawn promotion modal */}
                {promotionState && (
                    <div className="promotion-modal">
                        <div className="promotion-content">
                            <h3>Promote your pawn:</h3>
                            <div className="promotion-pieces">
                                {['queen', 'rook', 'bishop', 'knight'].map(piece => (
                                    <button
                                        key={piece}
                                        onClick={() => handlePawnPromotion(promotionState.row, promotionState.col, piece)}
                                        className="promotion-piece"
                                    >
                                        <ChessPiece piece={piece} color={promotionState.color} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChessBoard;
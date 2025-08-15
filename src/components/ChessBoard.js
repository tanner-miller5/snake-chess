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
        updateGameStatus(newBoard, nextPlayer);
    };

    // Computer pawn promotion (always promote to queen for simplicity)
    const handleComputerPromotion = (newBoard, row, col, color) => {
        newBoard[row][col] = { piece: 'queen', color };
        return newBoard;
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

    // Function to check if a move is valid (basic version without castling)
    const isValidMoveBasic = (from, toRow, toCol, gameBoard) => {
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
    const isSquareUnderAttack = (gameBoard, targetRow, targetCol, attackingColor) => {
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

    // Extended move validation that includes castling
    const isValidMoveExtended = (from, toRow, toCol, gameBoard, currentCastlingRights) => {
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
    const simulateMove = (gameBoard, from, to, isCastling = false, castlingSide = null) => {
        if (isCastling && castlingSide) {
            const piece = gameBoard[from.row][from.col];
            return executeCastle(gameBoard, piece.color, castlingSide);
        } else {
            const newBoard = gameBoard.map(row => [...row]);
            newBoard[to.row][to.col] = newBoard[from.row][from.col];
            newBoard[from.row][from.col] = null;
            return newBoard;
        }
    };

    // Function to get all possible legal moves for a color
    const getAllLegalMoves = (gameBoard, color, currentCastlingRights) => {
        const legalMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (isValidMoveExtended({ row, col }, toRow, toCol, gameBoard, currentCastlingRights)) {
                                // Check if this is a castling move
                                const isCastling = piece.piece === 'king' && Math.abs(toCol - col) === 2;
                                const castlingSide = isCastling ? (toCol > col ? 'kingside' : 'queenside') : null;
                                
                                // Check if this move would leave the king in check
                                const testBoard = simulateMove(gameBoard, { row, col }, { row: toRow, col: toCol }, isCastling, castlingSide);
                                if (!isInCheck(testBoard, color)) {
                                    legalMoves.push({
                                        from: { row, col },
                                        to: { row: toRow, col: toCol },
                                        isCapture: gameBoard[toRow][toCol] !== null,
                                        isCastling,
                                        castlingSide
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

    // Updated isValidMove that considers check and castling
    const isValidMove = useCallback((from, toRow, toCol) => {
        const piece = board[from.row][from.col];
        if (!piece || piece.color !== currentPlayer) return false;
        
        // First check if the basic move is valid
        if (!isValidMoveExtended(from, toRow, toCol, board, castlingRights)) return false;
        
        // Check if this is a castling move
        const isCastling = piece.piece === 'king' && Math.abs(toCol - from.col) === 2;
        const castlingSide = isCastling ? (toCol > from.col ? 'kingside' : 'queenside') : null;
        
        // Then check if this move would leave the king in check
        const testBoard = simulateMove(board, from, { row: toRow, col: toCol }, isCastling, castlingSide);
        return !isInCheck(testBoard, currentPlayer);
    }, [board, currentPlayer, castlingRights]);

    // Function to check if the current player is in checkmate
    const isCheckmate = (gameBoard, color) => {
        if (!isInCheck(gameBoard, color)) return false;
        
        const legalMoves = getAllLegalMoves(gameBoard, color, castlingRights);
        return legalMoves.length === 0;
    };

    // Function to check if the current player is in stalemate
    const isStalemate = (gameBoard, color) => {
        if (isInCheck(gameBoard, color)) return false;
        
        const legalMoves = getAllLegalMoves(gameBoard, color, castlingRights);
        return legalMoves.length === 0;
    };

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
    }, [castlingRights]);

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

    // Updated computer move logic with pawn promotion and castling
    const makeComputerMove = useCallback(() => {
        if (currentPlayer === 'black' && isComputerMode) {
            const allPossibleMoves = getAllLegalMoves(board, 'black', castlingRights);

            // Randomly select a move
            if (allPossibleMoves.length > 0) {
                const randomMove = allPossibleMoves[
                    Math.floor(Math.random() * allPossibleMoves.length)
                ];
                
                // Execute the move
                let newBoard = simulateMove(board, randomMove.from, randomMove.to, randomMove.isCastling, randomMove.castlingSide);
                
                // Update castling rights
                const movedPiece = board[randomMove.from.row][randomMove.from.col];
                updateCastlingRights(randomMove.from, randomMove.to, movedPiece);
                
                // Check for pawn promotion
                if (isPawnPromotion(movedPiece, randomMove.from.row, randomMove.to.row)) {
                    newBoard = handleComputerPromotion(newBoard, randomMove.to.row, randomMove.to.col, 'black');
                }
                
                setBoard(newBoard);
                setCurrentPlayer('white');
                
                // Update game status for the next player
                updateGameStatus(newBoard, 'white');
            }
        }
    }, [board, currentPlayer, isComputerMode, castlingRights, updateCastlingRights, updateGameStatus]);

    // Add effect for computer moves
    useEffect(() => {
        if (isComputerMode && currentPlayer === 'black' && !promotionState) {
            const timer = setTimeout(makeComputerMove, 500);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, isComputerMode, makeComputerMove, promotionState]);

    // Updated handleSquareClick with pawn promotion and castling
    const handleSquareClick = useCallback((row, col) => {
        // Don't allow moves if game is over or if promotion is in progress
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || promotionState) return;
        
        // Only allow white moves in computer mode
        if (isComputerMode && currentPlayer === 'black') return;

        if (selectedPiece) {
            if (isValidMove(selectedPiece, row, col)) {
                const piece = board[selectedPiece.row][selectedPiece.col];
                
                // Check if this is a castling move
                const isCastling = piece.piece === 'king' && Math.abs(col - selectedPiece.col) === 2;
                const castlingSide = isCastling ? (col > selectedPiece.col ? 'kingside' : 'queenside') : null;
                
                // Execute the move
                let newBoard = simulateMove(board, selectedPiece, { row, col }, isCastling, castlingSide);
                
                // Update castling rights
                updateCastlingRights(selectedPiece, { row, col }, piece);
                
                // Check for pawn promotion
                if (isPawnPromotion(piece, selectedPiece.row, row)) {
                    setBoard(newBoard);
                    setPromotionState({ row, col, color: piece.color });
                } else {
                    setBoard(newBoard);
                    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
                    setCurrentPlayer(nextPlayer);
                    
                    // Update game status for the next player
                    updateGameStatus(newBoard, nextPlayer);
                }
            }
            setSelectedPiece(null);
            setValidMoves([]);
        } else if (board[row][col] && board[row][col].color === currentPlayer) {
            setSelectedPiece({ row, col });
            setValidMoves(calculateValidMoves(row, col));
        }
    }, [gameStatus, promotionState, isComputerMode, currentPlayer, selectedPiece, isValidMove, board, updateGameStatus, calculateValidMoves, updateCastlingRights]);

    // Function to get status message
    const getStatusMessage = () => {
        if (promotionState) {
            return `Choose a piece to promote your pawn!`;
        }
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
        setPromotionState(null);
        setCastlingRights({
            white: { kingside: true, queenside: true, kingMoved: false },
            black: { kingside: true, queenside: true, kingMoved: false }
        });
        setMoveHistory([]);
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
                
                {/* Display castling rights for debugging */}
                <div className="castling-info">
                    <small>
                        White: K{castlingRights.white.kingside ? '✓' : '✗'} Q{castlingRights.white.queenside ? '✓' : '✗'} | 
                        Black: K{castlingRights.black.kingside ? '✓' : '✗'} Q{castlingRights.black.queenside ? '✓' : '✗'}
                    </small>
                </div>
            </div>

            {/* Pawn Promotion Modal */}
            {promotionState && (
                <div className="promotion-modal">
                    <div className="promotion-content">
                        <h3>Promote your pawn!</h3>
                        <p>Choose which piece to promote to:</p>
                        <div className="promotion-pieces">
                            <button
                                className="promotion-button"
                                onClick={() => handlePawnPromotion(promotionState.row, promotionState.col, 'queen')}
                            >
                                <ChessPiece piece="queen" color={promotionState.color} />
                                Queen
                            </button>
                            <button
                                className="promotion-button"
                                onClick={() => handlePawnPromotion(promotionState.row, promotionState.col, 'rook')}
                            >
                                <ChessPiece piece="rook" color={promotionState.color} />
                                Rook
                            </button>
                            <button
                                className="promotion-button"
                                onClick={() => handlePawnPromotion(promotionState.row, promotionState.col, 'bishop')}
                            >
                                <ChessPiece piece="bishop" color={promotionState.color} />
                                Bishop
                            </button>
                            <button
                                className="promotion-button"
                                onClick={() => handlePawnPromotion(promotionState.row, promotionState.col, 'knight')}
                            >
                                <ChessPiece piece="knight" color={promotionState.color} />
                                Knight
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
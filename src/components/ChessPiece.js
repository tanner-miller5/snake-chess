import React from 'react';

const ChessPiece = ({ piece, color }) => {
    const getPieceSymbol = () => {
        switch (piece) {
            case 'king': return color === 'white' ? '♔' : '♚';
            case 'queen': return color === 'white' ? '♕' : '♛';
            case 'rook': return color === 'white' ? '♖' : '♜';
            case 'bishop': return color === 'white' ? '♗' : '♝';
            case 'knight': return color === 'white' ? '♘' : '♞';
            case 'pawn': return color === 'white' ? '♙' : '♟';
            default: return '';
        }
    };

    return (
        <div className={`chess-piece ${color}`}>
            {getPieceSymbol()}
        </div>
    );
};

export default ChessPiece;
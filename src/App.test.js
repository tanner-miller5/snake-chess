import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChessBoard from './components/ChessBoard';
import ChessPiece from './components/ChessPiece';

describe('ChessBoard Basic Tests', () => {
    test('renders chess board', () => {
        const { container } = render(<ChessBoard />);
        const board = container.querySelector('.chess-board');
        expect(board).toBeInTheDocument();
    });

    test('displays current player', () => {
        const { getByText } = render(<ChessBoard />);
        expect(getByText('Current Player: white')).toBeInTheDocument();
    });

    test('renders initial board setup', () => {
        const { container } = render(<ChessBoard />);
        const squares = container.querySelectorAll('.square');
        expect(squares.length).toBe(64);
    });
});

describe('Basic Piece Movement', () => {
    let container, squares;
    
    beforeEach(() => {
        const { container: cont } = render(<ChessBoard />);
        container = cont;
        squares = container.querySelectorAll('.square');
    });

    test('can select white piece on first turn', () => {
        // Click white pawn
        fireEvent.click(squares[48]); // e2 pawn
        const selectedSquare = container.querySelector('.selected');
        expect(selectedSquare).not.toBeNull();
    });

    test('cannot select black piece on first turn', () => {
        // Click black pawn
        fireEvent.click(squares[8]); // e7 pawn
        const selectedSquare = container.querySelector('.selected');
        expect(selectedSquare).toBeNull();
    });
});

describe('ChessPiece Component', () => {
    test('renders white pieces with correct symbols', () => {
        const pieces = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
        const symbols = ['♔', '♕', '♖', '♗', '♘', '♙'];
        
        pieces.forEach((piece, index) => {
            const { container } = render(<ChessPiece piece={piece} color="white" />);
            expect(container.textContent).toBe(symbols[index]);
            expect(container.firstChild).toHaveClass('chess-piece', 'white');
        });
    });

    test('renders black pieces with correct symbols', () => {
        const pieces = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
        const symbols = ['♚', '♛', '♜', '♝', '♞', '♟'];
        
        pieces.forEach((piece, index) => {
            const { container } = render(<ChessPiece piece={piece} color="black" />);
            expect(container.textContent).toBe(symbols[index]);
            expect(container.firstChild).toHaveClass('chess-piece', 'black');
        });
    });

    test('handles invalid piece type', () => {
        const { container } = render(<ChessPiece piece="invalid" color="white" />);
        expect(container.textContent).toBe('');
        expect(container.firstChild).toHaveClass('chess-piece', 'white');
    });
});

describe('Individual Piece Tests', () => {
    describe('King', () => {
        test('renders white king', () => {
            const { container } = render(<ChessPiece piece="king" color="white" />);
            expect(container.textContent).toBe('♔');
        });

        test('renders black king', () => {
            const { container } = render(<ChessPiece piece="king" color="black" />);
            expect(container.textContent).toBe('♚');
        });
    });

    describe('Queen', () => {
        test('renders white queen', () => {
            const { container } = render(<ChessPiece piece="queen" color="white" />);
            expect(container.textContent).toBe('♕');
        });

        test('renders black queen', () => {
            const { container } = render(<ChessPiece piece="queen" color="black" />);
            expect(container.textContent).toBe('♛');
        });
    });

    describe('Rook', () => {
        test('renders white rook', () => {
            const { container } = render(<ChessPiece piece="rook" color="white" />);
            expect(container.textContent).toBe('♖');
        });

        test('renders black rook', () => {
            const { container } = render(<ChessPiece piece="rook" color="black" />);
            expect(container.textContent).toBe('♜');
        });
    });

    describe('Bishop', () => {
        test('renders white bishop', () => {
            const { container } = render(<ChessPiece piece="bishop" color="white" />);
            expect(container.textContent).toBe('♗');
        });

        test('renders black bishop', () => {
            const { container } = render(<ChessPiece piece="bishop" color="black" />);
            expect(container.textContent).toBe('♝');
        });
    });

    describe('Knight', () => {
        test('renders white knight', () => {
            const { container } = render(<ChessPiece piece="knight" color="white" />);
            expect(container.textContent).toBe('♘');
        });

        test('renders black knight', () => {
            const { container } = render(<ChessPiece piece="knight" color="black" />);
            expect(container.textContent).toBe('♞');
        });
    });

    describe('Pawn', () => {
        test('renders white pawn', () => {
            const { container } = render(<ChessPiece piece="pawn" color="white" />);
            expect(container.textContent).toBe('♙');
        });

        test('renders black pawn', () => {
            const { container } = render(<ChessPiece piece="pawn" color="black" />);
            expect(container.textContent).toBe('♟');
        });
    });
});

describe('Component Structure', () => {
    test('applies correct CSS classes', () => {
        const { container } = render(<ChessPiece piece="pawn" color="white" />);
        const pieceElement = container.firstChild;
        expect(pieceElement).toHaveClass('chess-piece');
        expect(pieceElement).toHaveClass('white');
    });

    test('maintains proper DOM structure', () => {
        const { container } = render(<ChessPiece piece="pawn" color="white" />);
        expect(container.firstChild.tagName).toBe('DIV');
        expect(container.firstChild.children.length).toBe(0);
    });
});

describe('Edge Cases', () => {
    test('handles missing props', () => {
        const { container } = render(<ChessPiece />);
        expect(container.textContent).toBe('');
        expect(container.firstChild).toHaveClass('chess-piece');
    });

    test('handles empty string props', () => {
        const { container } = render(<ChessPiece piece="" color="" />);
        expect(container.textContent).toBe('');
        expect(container.firstChild).toHaveClass('chess-piece');
    });
});
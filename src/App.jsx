import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import axios from "axios";
import { Chess } from "chess.js";

function App() {
	const [username, setUsername] = useState("");
	const [games, setGames] = useState([]);
	const [selectedGame, setSelectedGame] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [chessGame, setChessGame] = useState(new Chess());
	const [stockfish, setStockfish] = useState(null);

	useEffect(() => {
		const newStockfish = new Worker("stockfish.js");
		newStockfish.onmessage = function (event) {
			console.log("From Stockfish: ", event.data);
		};
		setStockfish(newStockfish);

		return () => {
			newStockfish.terminate();
		};
	}, []);

	useEffect(() => {
		if (selectedGame && stockfish) {
			console.log("Selected game is available for analysis.");
			const moves = formatMoves(selectedGame.pgn);
			analyzeGameWithStockfish(moves);
			setUpBoardWithGame(selectedGame.pgn);
		}
	}, [selectedGame, stockfish]);

	const analyzeGameWithStockfish = moves => {
		console.log("Analyzing game with moves:", moves);
		if (stockfish) {
			stockfish.postMessage({ cmd: "ucinewgame" });
			stockfish.postMessage({
				cmd: "position",
				position: "startpos",
				moves: moves,
			});
			stockfish.postMessage({ cmd: "go", depth: 20 });
		} else {
			console.log("Stockfish worker is not initialized");
		}
	};

	const formatMoves = pgn => {
		const movesSection = pgn.split("\n\n")[1];
		return movesSection
			.replace(/\{[\s\S]*?\}/g, "")
			.trim()
			.replace(/\d+\./g, "")
			.replace(/\s{2,}/g, " ");
	};

	const setUpBoardWithGame = pgn => {
		const chess = new Chess();
		chess.loadPgn(pgn);
		setChessGame(chess);
	};

	const onDrop = (sourceSquare, targetSquare) => {
		let move = chessGame.move({
			from: sourceSquare,
			to: targetSquare,
			promotion: "q",
		});

		if (move === null) return false;
		setChessGame(prev => new Chess(prev.fen()));
		return true;
	};

	const fetchGames = async () => {
		if (!username) {
			setError("Please enter a username");
			return;
		}
		setError("");
		setIsLoading(true);
		const url = `https://api.chess.com/pub/player/${username}/games/archives`;
		try {
			const archivesResponse = await axios.get(url);
			const lastMonthGamesUrl = archivesResponse.data.archives.pop();
			const gamesResponse = await axios.get(lastMonthGamesUrl);
			setGames(gamesResponse.data.games);
		} catch (error) {
			setError("Failed to fetch games");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGameSelect = event => {
		const game = games.find(g => g.url === event.target.value);
		setSelectedGame(game);
	};

	return (
		<div>
			<h1 className='text-4xl font-bold'>
				Pass chess.com username and analyze your games!
			</h1>
			<input
				type='text'
				value={username}
				onChange={e => setUsername(e.target.value)}
				placeholder='Enter Chess.com Username'
				className='border-2 border-gray-300'
			/>
			<button
				onClick={fetchGames}
				disabled={isLoading}
				className='bg-blue-500 text-white px-4 py-2'
			>
				Fetch Games
			</button>
			{isLoading && <p>Loading...</p>}
			{error && <p className='text-red-500'>{error}</p>}
			{games.length > 0 && (
				<div>
					<h2>Games Fetched Successfully!</h2>
					<select onChange={handleGameSelect} value={selectedGame?.url || ""}>
						{games.map((game, index) => (
							<option key={index} value={game.url}>
								{game.url}
							</option>
						))}
					</select>
				</div>
			)}
			<div className='flex items-center justify-center w-full mt-10'>
				<Chessboard
					id='BasicBoard'
					position={chessGame.fen()}
					onPieceDrop={onDrop}
				/>
			</div>
		</div>
	);
}

export default App;

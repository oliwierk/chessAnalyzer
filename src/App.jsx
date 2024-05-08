import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import axios from "axios";

function App() {
	const [username, setUsername] = useState("");
	const [games, setGames] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [stockfish, setStockfish] = useState(null);

	useEffect(() => {
		console.log("Setting up Stockfish worker...");
		const newStockfish = new Worker("stockfish.js");
		newStockfish.onmessage = function (event) {
			console.log("From Stockfish: ", event.data);
		};
		setStockfish(newStockfish);

		return () => {
			console.log("Terminating Stockfish worker...");
			newStockfish.terminate();
		};
	}, []);

	useEffect(() => {
		if (games.length > 0 && stockfish) {
			console.log("Games are available for analysis.");
			const gamePGN = games[0].pgn;
			if (gamePGN) {
				analyzeGameWithStockfish(formatMoves(gamePGN));
			}
		} else {
			console.log("No games available or Stockfish is not ready.");
		}
	}, [games, stockfish]);

	const formatMoves = pgn => {
		// Extract only the moves from the full PGN, removing headers
		const moves = pgn.split("\n\n")[1].replace(/\d+\./g, "").trim(); // Regex to remove move numbers
		return moves.replaceAll(" {[%clk 0:04:59.7]}", ""); // Adjust based on actual format if needed
	};

	const analyzeGameWithStockfish = moves => {
		console.log("Analyzing game with moves:", moves);
		if (stockfish) {
			stockfish.postMessage(`position startpos moves ${moves}`);
			stockfish.postMessage("go depth 20");
		} else {
			console.log("Stockfish worker is not initialized");
		}
	};

	const fetchGames = async () => {
		if (!username) {
			setError("Please enter a username");
			console.log("No username provided.");
			return;
		}
		setError("");
		setIsLoading(true);
		const url = `https://api.chess.com/pub/player/${username}/games/archives`;
		try {
			const archivesResponse = await axios.get(url);
			const monthsUrls = archivesResponse.data.archives;
			const lastMonthGamesUrl = monthsUrls[monthsUrls.length - 1];
			const gamesResponse = await axios.get(lastMonthGamesUrl);
			setGames(gamesResponse.data.games);
		} catch (error) {
			console.error("Error fetching games:", error);
			setError("Failed to fetch games");
		} finally {
			setIsLoading(false);
		}
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
					<ul>
						{games.map((game, index) => (
							<li key={index}>{game.url}</li>
						))}
					</ul>
				</div>
			)}
			<div className='flex items-center justify-center w-full mt-10'>
				<Chessboard id='BasicBoard' />
			</div>
		</div>
	);
}

export default App;

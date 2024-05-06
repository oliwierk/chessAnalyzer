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
			const gamePGN = games[0].pgn; // Assuming you want to analyze the first game's PGN
			analyzeGameWithStockfish(gamePGN);
		} else {
			console.log("No games available or Stockfish is not ready.");
		}
	}, [games, stockfish]); // This ensures the effect runs when either games or stockfish changes

	const analyzeGameWithStockfish = pgn => {
		console.log("Analyzing game with PGN:", pgn);
		if (stockfish) {
			stockfish.postMessage(`position startpos moves ${pgn}`);
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
		console.log(`Fetching games for username: ${username}`);
		const url = `https://api.chess.com/pub/player/${username}/games/archives`;
		try {
			const archivesResponse = await axios.get(url);
			console.log("Archives fetched:", archivesResponse.data.archives);
			const monthsUrls = archivesResponse.data.archives;
			const lastMonthGamesUrl = monthsUrls[monthsUrls.length - 1];
			const gamesResponse = await axios.get(lastMonthGamesUrl);
			console.log("Games fetched:", gamesResponse.data.games);
			setGames(gamesResponse.data.games);
			setIsLoading(false);
		} catch (error) {
			console.error("Error fetching games:", error);
			setError("Failed to fetch games");
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
			<button onClick={fetchGames} className='bg-blue-500 text-white px-4 py-2'>
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
				<div className='w-1/2'>
					<Chessboard id='BasicBoard' />
				</div>
			</div>
		</div>
	);
}

export default App;

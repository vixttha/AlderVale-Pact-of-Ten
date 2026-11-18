module Main (main) where

import Control.Monad (forM_, unless)
import Data.List (intercalate, partition, sort)
import System.Environment (getArgs)
import System.Exit (die)

data Card = Dart | Bolt | Ward | Ink | Reshuffle | KeenDart | KeenBolt
  deriving (Eq, Ord, Show)

data Piles = Piles
  { hand :: [Card]
  , deck :: [Card]
  , discard :: [Card]
  , sideboard :: [Card]
  }

data Move
  = Pass
  | DiscardAndSelect [Int] Int
  | Enchant Int Int
  | UseSideboard Int Int Bool
  | Recycle Int

data Scenario = Scenario String String Piles Move

scenarios :: [Scenario]
scenarios =
  [ Scenario "G06-004" "draw-in-deck-order" (Piles [Ward] [Dart, Bolt, Dart, Ward, Bolt, Ward, Dart] [] []) Pass
  , Scenario "G06-004" "short-deck" (Piles [Dart, Ward] [Bolt, Dart] [Ward] []) Pass
  , Scenario "G06-004" "full-hand" (Piles [Dart, Bolt, Ward, Bolt, Dart, Ward, Dart] [Bolt] [] []) Pass
  , Scenario "G06-004" "empty-deck" (Piles [Ward] [] [] []) Pass
  , Scenario "G06-005" "duplicate-selected-after-discard"
      (Piles [Ward, Dart, Bolt, Dart] [Ward, Bolt, Ward, Dart, Ward] [] [])
      (DiscardAndSelect [1, 0, 1] 3)
  , Scenario "G06-005" "selected-card-was-discarded"
      (Piles [Bolt, Dart, Ward] [Dart, Bolt, Ward] [] [])
      (DiscardAndSelect [1] 1)
  , Scenario "G06-005" "discard-across-distinct-duplicates"
      (Piles [Dart, Bolt, Dart, Ward, Bolt] [Dart, Ward] [Ward] [])
      (DiscardAndSelect [0, 3] 2)
  , Scenario "G06-006" "enchant-only-one-copy"
      (Piles [Ink, Dart, Bolt, Dart] [Ward, Bolt] [] []) (Enchant 0 3)
  , Scenario "G06-006" "enchant-before-ink"
      (Piles [Bolt, Ward, Ink, Bolt] [Dart] [] []) (Enchant 2 0)
  , Scenario "G06-006" "ward-is-ineligible"
      (Piles [Ink, Ward, Bolt] [] [] []) (Enchant 0 1)
  , Scenario "G06-006" "cannot-enchant-itself"
      (Piles [Ink, Dart] [] [] []) (Enchant 0 0)
  , Scenario "G06-007" "successful-sideboard-cast"
      (Piles [Bolt, Ward] [Dart] [] [Dart, Bolt, Dart]) (UseSideboard 1 0 True)
  , Scenario "G06-007" "fizzled-sideboard-cast"
      (Piles [Bolt, Ward] [Dart] [] [Dart, Bolt, Dart]) (UseSideboard 1 0 False)
  , Scenario "G06-008" "recycle-after-existing-deck"
      (Piles [Ward, Reshuffle, Bolt, Dart, Ward, Dart, Bolt] [Dart] [Bolt, Dart, Ward] [Ward]) (Recycle 1)
  , Scenario "G06-008" "recycle-into-open-hand"
      (Piles [Reshuffle, Dart] [] [Ward, Dart, Ward] [Bolt]) (Recycle 0)
  ]

cardId :: Card -> String
cardId Dart = "ember_cinder_dart"
cardId Bolt = "gale_feather_bolt"
cardId Ward = "frost_tower_ward"
cardId Ink = "uni_enchant_keen"
cardId Reshuffle = "uni_reshuffle"
cardId KeenDart = cardId Dart ++ "+keen"
cardId KeenBolt = cardId Bolt ++ "+keen"

pileFields :: Piles -> [String]
pileFields piles = map (intercalate "," . map cardId)
  [hand piles, deck piles, discard piles, sideboard piles]

refill :: Piles -> Piles
refill piles = piles {hand = hand piles ++ drawn, deck = remaining}
  where (drawn, remaining) = splitAt (7 - length (hand piles)) (deck piles)

without :: Int -> [a] -> [a]
without position xs = take position xs ++ drop (position + 1) xs

upgrade :: Card -> Maybe Card
upgrade Dart = Just KeenDart
upgrade Bolt = Just KeenBolt
upgrade _ = Nothing

applyMove :: Move -> Piles -> Piles
applyMove Pass piles = piles
applyMove (DiscardAndSelect positions selected) piles = afterCast
  where
    original = zip [0 ..] (hand piles)
    (discarded, kept) = partition (\(position, _) -> elem position positions) original
    cycled = refill (piles {hand = map snd kept, discard = discard piles ++ reverse (map snd discarded)})
    afterCast = case lookup selected kept of
      Nothing -> cycled
      Just card -> cycled
        { hand = [value | (position, value) <- kept, position /= selected] ++ drop (length kept) (hand cycled)
        , discard = discard cycled ++ [card]
        }
applyMove (Enchant source destination) piles
  | source /= destination
  , lookup source original == Just Ink
  , Just enchanted <- lookup destination original >>= upgrade =
      piles {hand = [if position == destination then enchanted else card
                    | (position, card) <- original, position /= source]}
  | otherwise = piles
  where original = zip [0 ..] (hand piles)
applyMove (UseSideboard position _ succeeds) piles
  | succeeds = piles {sideboard = without position (sideboard piles)}
  | otherwise = piles
applyMove (Recycle position) piles = piles
  { hand = without position (hand piles)
  , deck = deck piles ++ discard piles ++ [Reshuffle]
  , discard = []
  }

moveFields :: Move -> [String]
moveFields Pass = ["", "", "", "", "", "0"]
moveFields (DiscardAndSelect positions selected) =
  [show selected, intercalate "," (map show positions), "", "", "", "0"]
moveFields (Enchant source destination) = ["", "", show source, show destination, "", "0"]
moveFields (UseSideboard position selected succeeds) =
  [show selected, "", "", "", show position, if succeeds then "0" else "0.99"]
moveFields (Recycle position) = [show position, "", "", "", "", "0"]

checkpoints :: Scenario -> [[String]]
checkpoints (Scenario caseId name piles move) =
  [row "1" first, row "2" second]
  where
    first = refill (applyMove move piles)
    second = refill first
    row checkpoint state = [caseId, name, checkpoint] ++ pileFields state

scenarioFields :: Scenario -> [String]
scenarioFields (Scenario caseId name piles move) =
  [caseId, name] ++ pileFields piles ++ moveFields move

splitTabs :: String -> [String]
splitTabs input = case break (== '\t') input of
  (field, '\t' : rest) -> field : splitTabs rest
  (field, _) -> [field]

difference :: [[String]] -> [[String]] -> Maybe String
difference [] [] = Nothing
difference [] (got : _) = Just ("unexpected row " ++ show got)
difference (wanted : _) [] = Just ("missing row " ++ show wanted)
difference (wanted : expected) (got : observed)
  | wanted == got = difference expected observed
  | otherwise = Just ("expected " ++ show wanted ++ "\nobserved " ++ show got)

insertExtraCard :: String -> Int -> [[String]] -> [[String]]
insertExtraCard caseId column (row : rest)
  | take 1 row == [caseId]
  , (before, field : after) <- splitAt column row =
      (before ++ [intercalate "," (filter (not . null) [field, cardId Dart])] ++ after) : rest
  | otherwise = row : insertExtraCard caseId column rest
insertExtraCard _ _ [] = []

inventory :: Piles -> [Card]
inventory piles = sort (hand piles ++ deck piles ++ discard piles ++ sideboard piles)

verify :: FilePath -> IO ()
verify path = do
  actual <- map splitTabs . lines <$> readFile path
  let expected = concatMap checkpoints scenarios
      controls = [("G06-004", 3), ("G06-005", 5), ("G06-006", 3), ("G06-007", 6), ("G06-008", 4)]
  case difference expected actual of
    Just reason -> die reason
    Nothing -> pure ()
  forM_ [(piles, move) | Scenario _ _ piles move@(Recycle _) <- scenarios] $ \(piles, move) ->
    unless (inventory piles == inventory (applyMove move piles)) $
      die "Reshuffle model lost or duplicated a card"
  forM_ controls $ \(caseId, column) -> do
    unless (difference expected (insertExtraCard caseId column actual) /= Nothing) $
      die (caseId ++ " accepted an inserted extra card")
    let count = length [() | Scenario key _ _ _ <- scenarios, key == caseId]
    putStrLn (caseId ++ " PASS (" ++ show count ++ " scenarios; extra-card control rejected)")
  putStrLn ("Haskell spell card contracts: 5/5 passed, " ++ show (length scenarios)
    ++ " scenarios, " ++ show (length actual) ++ " checkpoints")

main :: IO ()
main = do
  args <- getArgs
  case args of
    ["fixtures"] -> mapM_ (putStrLn . intercalate "\t" . scenarioFields) scenarios
    ["verify", path] -> verify path
    _ -> die "Usage: spell-card-contracts fixtures | verify OBSERVATIONS"

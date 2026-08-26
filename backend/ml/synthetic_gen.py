import random
import re

class DyslexiaTextGenerator:
    """
    A simple rule-based generator for creating synthetic training data for dyslexia detection.
    It takes standard text and applies common dyslexic error patterns.
    """
    
    def __init__(self):
        # Common phonetic confusions and visual reversals
        self.reversals = {
            'b': 'd', 'd': 'b',
            'p': 'q', 'q': 'p',
            'm': 'w', 'w': 'm',
            'n': 'u', 'u': 'n'
        }
        
        self.phonetic_errors = {
            'ph': 'f', 'f': 'ph',
            'ck': 'k', 'k': 'c',
            'tion': 'shun',
            'th': 'd'
        }

    def apply_reversals(self, word: str, probability: float = 0.3) -> str:
        """Randomly swap visually similar letters like b/d."""
        result = list(word)
        for i, char in enumerate(result):
            if char.lower() in self.reversals and random.random() < probability:
                # Maintain case if possible, though simplified here
                result[i] = self.reversals[char.lower()]
        return "".join(result)

    def apply_transpositions(self, word: str, probability: float = 0.2) -> str:
        """Randomly swap adjacent letters (e.g. was -> saw)."""
        if len(word) < 3 or random.random() > probability:
            return word
        
        result = list(word)
        idx = random.randint(0, len(word) - 2)
        result[idx], result[idx+1] = result[idx+1], result[idx]
        return "".join(result)
        
    def generate_pair(self, clean_sentence: str):
        """
        Takes a clean sentence and returns a tuple of (clean, dyslexic_simulation)
        """
        words = clean_sentence.split()
        dyslexic_words = []
        
        for word in words:
            # Randomly decide if this word will get an error
            if random.random() < 0.4:
                error_type = random.choice(['reversal', 'transposition'])
                if error_type == 'reversal':
                    word = self.apply_reversals(word)
                else:
                    word = self.apply_transpositions(word)
            dyslexic_words.append(word)
            
        return clean_sentence, " ".join(dyslexic_words)

if __name__ == "__main__":
    generator = DyslexiaTextGenerator()
    clean = "The brown dog jumped over the quick fox."
    _, synthetic = generator.generate_pair(clean)
    print(f"Clean: {clean}")
    print(f"Synthetic: {synthetic}")

import re
from spellchecker import SpellChecker

class DyslexiaAnalyzer:
    def __init__(self):
        self.spell = SpellChecker()
        
        # Common reversal pairs
        self.reversal_chars = set(['b', 'd', 'p', 'q', 'm', 'w', 'n', 'u'])
        
        # Common phonetic substitutions in children/dyslexia
        self.phonetic_map = {
            'ph': 'f', 'f': 'ph',
            'ck': 'k', 'k': 'c',
            'tion': 'shun',
            'shun': 'tion',
            'thay': 'they',
            'ther': 'there',
            'wuz': 'was',
            'sed': 'said',
            'kum': 'come',
            'skool': 'school',
            'nite': 'night'
        }
        
    def check_reversal(self, word, correct_word):
        # A simple heuristic: if they swapped b/d, p/q etc.
        # It's hard to know precisely without a trained model, 
        # but if the misspelled word differs from the correct word primarily by these chars:
        diff_chars = set(word) ^ set(correct_word)
        if diff_chars.intersection(self.reversal_chars):
            return True
        return False

    def check_phonetic(self, word, correct_word):
        # Check if the misspelled word is in our phonetic map
        for wrong, right in self.phonetic_map.items():
            if wrong in word and right in correct_word:
                return True
        return False
        
    def analyze_written_text(self, text, expected_keywords=None):
        if not text or len(text.strip()) == 0:
            return self._empty_result()
            
        expected_keywords = expected_keywords or []
        expected_keywords = [k.lower() for k in expected_keywords]
        
        # Clean text
        words = re.findall(r'\b[a-z]+\b', text.lower())
        total_words = len(words)
        
        if total_words == 0:
            return self._empty_result()
            
        # Spelling Analysis
        misspelled = self.spell.unknown(words)
        
        reversal_count = 0
        phonetic_count = 0
        flagged_words = []
        
        for bad_word in misspelled:
            correct_word = self.spell.correction(bad_word)
            if not correct_word:
                continue
                
            flagged = f"{bad_word} (→{correct_word})"
            flagged_words.append(flagged)
            
            # Check for reversals
            if self.check_reversal(bad_word, correct_word):
                reversal_count += 1
                
            # Check for phonetic spelling
            if self.check_phonetic(bad_word, correct_word):
                phonetic_count += 1
                
        # Keyword / On-Topic Validation
        keyword_hits = 0
        for word in words:
            for kw in expected_keywords:
                if kw in word:
                    keyword_hits += 1
                    break
                    
        # Calculate Scores
        # 1. Spelling Accuracy (General spelling)
        spelling_score = max(0, 100 - (len(misspelled) / max(total_words, 1)) * 100 * 1.5)
        
        # 2. Reversals (Specific dyslexia indicator)
        reversal_score = max(0, 100 - (reversal_count * 20))
        
        # 3. Phonetic Errors (Specific dyslexia indicator)
        phonetic_score = max(0, 100 - (phonetic_count * 20))
        
        # 4. Relevance (Did they describe the image?)
        relevance_score = 100
        if expected_keywords:
            if keyword_hits == 0:
                relevance_score = 20 # Off-topic
            elif keyword_hits == 1:
                relevance_score = 60
            else:
                relevance_score = 100
                
        indicators = [
            {"name": "Spelling Accuracy", "score": int(spelling_score), "icon": "📝"},
            {"name": "Letter Reversals", "score": int(reversal_score), "icon": "🔁"},
            {"name": "Phonetic Accuracy", "score": int(phonetic_score), "icon": "🔤"},
            {"name": "Prompt Relevance", "score": int(relevance_score), "icon": "🎯"}
        ]
        
        return {
            "totalWords": total_words,
            "indicators": indicators,
            "flaggedWords": flagged_words,
            "summary": "Analyzed successfully via backend."
        }

    def _empty_result(self):
        return {
            "totalWords": 0,
            "indicators": [],
            "flaggedWords": [],
            "summary": "No text provided."
        }

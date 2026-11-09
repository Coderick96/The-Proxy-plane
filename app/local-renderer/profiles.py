"""Conservative starting settings, not a benchmark or a quality guarantee."""
def choose_profile(device, memory_gb):
    if device == 'cuda' and memory_gb >= 16:
        return dict(model='sdxl', width=1024, height=1536, steps=35, offload=False)
    if device == 'cuda' and memory_gb >= 10:
        return dict(model='sdxl', width=832, height=1216, steps=30, offload=False)
    if device == 'cuda' and memory_gb >= 6:
        return dict(model='sdxl', width=768, height=1152, steps=28, offload=True)
    if device == 'mps' and memory_gb >= 24:
        return dict(model='sdxl', width=768, height=1152, steps=28, offload=False)
    return dict(model='sd15', width=512, height=768, steps=30, offload=False)

def dimensions(profile, size):
    w, h = profile['width'], profile['height']
    if size == '1536x1024':
        return h, w
    if size == '1024x1024':
        return w, w
    return w, h

def fallback_profile():
    return dict(model='sd15', width=384, height=576, steps=28, offload=False)
